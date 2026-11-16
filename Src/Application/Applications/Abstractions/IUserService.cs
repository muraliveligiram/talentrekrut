using Applications.Contracts;

namespace Applications.Abstractions;

public interface IUserService
{
    Task<PagedResult<UserResponse>> GetPageAsync(
        string? search,
        string? role,
        bool? isActive,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<UserResponse?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<UserResponse> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default);
    Task<UserResponse?> UpdateAsync(long id, UpdateUserRequest request, CancellationToken cancellationToken = default);
    Task<bool> ResetPasswordAsync(long id, ResetPasswordRequest request, CancellationToken cancellationToken = default);
    Task<bool> ChangeOwnPasswordAsync(ChangePasswordRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RecruiterOption>> GetRecruiterOptionsAsync(CancellationToken cancellationToken = default);
}
