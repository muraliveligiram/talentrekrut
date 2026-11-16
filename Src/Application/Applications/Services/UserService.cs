using Applications.Abstractions;
using Applications.Contracts;
using Applications.Exceptions;
using Domain.Entities;
using FluentValidation;

namespace Applications.Services;

public sealed class UserService(
    IUserRepository userRepository,
    IPasswordHashService passwordHashService,
    ICurrentUserService currentUserService,
    IValidator<CreateUserRequest> createValidator,
    IValidator<UpdateUserRequest> updateValidator,
    IValidator<ResetPasswordRequest> resetPasswordValidator,
    IValidator<ChangePasswordRequest> changePasswordValidator) : IUserService
{
    public async Task<PagedResult<UserResponse>> GetPageAsync(
        string? search,
        string? role,
        bool? isActive,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var (users, totalCount) = await userRepository.GetPageAsync(
            search?.Trim(),
            string.IsNullOrWhiteSpace(role) ? null : role.Trim(),
            isActive,
            page,
            pageSize,
            cancellationToken);

        return new PagedResult<UserResponse>(
            users.Select(ToResponse).ToArray(),
            page,
            pageSize,
            totalCount);
    }

    public async Task<UserResponse?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(id, cancellationToken);
        return user is null ? null : ToResponse(user);
    }

    public async Task<UserResponse> CreateAsync(
        CreateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        await createValidator.ValidateAndThrowAsync(request, cancellationToken);
        var email = request.Email.Trim();
        var normalizedEmail = Normalize(email);
        if (await userRepository.EmailExistsAsync(normalizedEmail, excludeUserId: null, cancellationToken))
        {
            throw new DuplicateEmailException();
        }

        var user = new User
        {
            Email = email,
            NormalizedEmail = normalizedEmail,
            FullName = request.FullName.Trim(),
            IsActive = true
        };
        user.PasswordHash = passwordHashService.HashPassword(user, request.Password);
        foreach (var role in await LoadRolesAsync(request.Roles, cancellationToken))
        {
            user.UserRoles.Add(new UserRole { Role = role, RoleId = role.Id });
        }

        await userRepository.AddAsync(user, cancellationToken);
        await userRepository.SaveChangesAsync(cancellationToken);
        return ToResponse(user);
    }

    public async Task<UserResponse?> UpdateAsync(
        long id,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        await updateValidator.ValidateAndThrowAsync(request, cancellationToken);
        var user = await userRepository.GetForUpdateAsync(id, cancellationToken);
        if (user is null)
        {
            return null;
        }

        var keepsAdmin = request.Roles.Contains(RoleNames.Admin, StringComparer.OrdinalIgnoreCase);
        if (id == currentUserService.UserId && (!request.IsActive || !keepsAdmin))
        {
            throw new SelfLockoutException();
        }

        var email = request.Email.Trim();
        var normalizedEmail = Normalize(email);
        if (normalizedEmail != user.NormalizedEmail
            && await userRepository.EmailExistsAsync(normalizedEmail, id, cancellationToken))
        {
            throw new DuplicateEmailException();
        }

        user.Email = email;
        user.NormalizedEmail = normalizedEmail;
        user.FullName = request.FullName.Trim();
        user.IsActive = request.IsActive;
        await SyncRolesAsync(user, request.Roles, cancellationToken);

        await userRepository.SaveChangesAsync(cancellationToken);
        return ToResponse(user);
    }

    public async Task<bool> ResetPasswordAsync(
        long id,
        ResetPasswordRequest request,
        CancellationToken cancellationToken = default)
    {
        await resetPasswordValidator.ValidateAndThrowAsync(request, cancellationToken);
        var user = await userRepository.GetForUpdateAsync(id, cancellationToken);
        if (user is null)
        {
            return false;
        }

        user.PasswordHash = passwordHashService.HashPassword(user, request.NewPassword);
        await userRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> ChangeOwnPasswordAsync(
        ChangePasswordRequest request,
        CancellationToken cancellationToken = default)
    {
        await changePasswordValidator.ValidateAndThrowAsync(request, cancellationToken);
        var userId = currentUserService.UserId;
        var user = userId is null ? null : await userRepository.GetForUpdateAsync(userId.Value, cancellationToken);
        if (user is null || !user.IsActive)
        {
            return false;
        }

        if (!passwordHashService.VerifyPassword(user, request.CurrentPassword))
        {
            throw new InvalidCurrentPasswordException();
        }

        user.PasswordHash = passwordHashService.HashPassword(user, request.NewPassword);
        await userRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public Task<IReadOnlyList<RecruiterOption>> GetRecruiterOptionsAsync(
        CancellationToken cancellationToken = default)
    {
        return userRepository.GetRecruiterOptionsAsync(cancellationToken);
    }

    private async Task SyncRolesAsync(
        User user,
        IReadOnlyCollection<string> requestedRoles,
        CancellationToken cancellationToken)
    {
        var roles = await LoadRolesAsync(requestedRoles, cancellationToken);
        var requestedIds = roles.Select(role => role.Id).ToHashSet();

        foreach (var link in user.UserRoles)
        {
            var shouldHave = requestedIds.Contains(link.RoleId);
            if (link.IsDeleted == shouldHave)
            {
                link.IsDeleted = !shouldHave;
            }
        }

        foreach (var role in roles.Where(role => user.UserRoles.All(link => link.RoleId != role.Id)))
        {
            user.UserRoles.Add(new UserRole { Role = role, RoleId = role.Id });
        }
    }

    private async Task<IReadOnlyList<Role>> LoadRolesAsync(
        IReadOnlyCollection<string> requestedRoles,
        CancellationToken cancellationToken)
    {
        var distinctRoles = requestedRoles.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        var roles = await userRepository.GetRolesAsync(distinctRoles, cancellationToken);
        if (roles.Count != distinctRoles.Length)
        {
            throw new ValidationException("One or more selected roles do not exist.");
        }

        return roles;
    }

    private static string Normalize(string email) => email.Trim().ToUpperInvariant();

    private static UserResponse ToResponse(User user)
    {
        return new UserResponse(
            user.Id,
            user.Email,
            user.FullName,
            user.UserRoles
                .Where(link => !link.IsDeleted)
                .Select(link => link.Role.Name)
                .OrderBy(name => name, StringComparer.Ordinal)
                .ToArray(),
            user.IsActive,
            user.LastLoginAt,
            user.CreatedAt);
    }
}
