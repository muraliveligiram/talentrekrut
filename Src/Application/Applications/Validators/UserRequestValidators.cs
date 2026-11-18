using Applications.Contracts;
using Domain.Entities;
using FluentValidation;

namespace Applications.Validators;

internal static class UserRules
{
    public const int MinimumPasswordLength = 12;
    public const int MaximumPasswordLength = 128;

    private static readonly string[] AssignableRoles = [RoleNames.Admin, RoleNames.Recruiter, RoleNames.Vendor];

    public static bool IsVendor(IEnumerable<string>? roles) =>
        roles?.Contains(RoleNames.Vendor, StringComparer.OrdinalIgnoreCase) == true;

    /// <summary>Vendors must belong to exactly one company and cannot also hold a staff role.</summary>
    public static void VendorRules<T>(AbstractValidator<T> validator, Func<T, List<string>> roles, Func<T, long?> companyId)
    {
        validator.RuleFor(request => roles(request))
            .Must(value => !IsVendor(value) || value.Count(role => !string.IsNullOrWhiteSpace(role)) == 1)
            .WithName("Roles")
            .WithMessage("The Vendor role cannot be combined with Admin or Recruiter.");
        validator.RuleFor(request => companyId(request))
            .Must(id => id is > 0)
            .When(request => IsVendor(roles(request)))
            .WithName("CompanyId")
            .WithMessage("Select the company this vendor belongs to.");
        validator.RuleFor(request => companyId(request))
            .Null()
            .When(request => !IsVendor(roles(request)))
            .WithName("CompanyId")
            .WithMessage("Only vendor users can be linked to a company.");
    }

    public static IRuleBuilderOptions<T, string> ValidPassword<T>(this IRuleBuilder<T, string> rule)
    {
        return rule
            .NotEmpty()
            .MinimumLength(MinimumPasswordLength)
            .WithMessage($"Password must be at least {MinimumPasswordLength} characters.")
            .MaximumLength(MaximumPasswordLength)
            .Must(password => password is null || password.Trim().Length == password.Length)
            .WithMessage("Password must not start or end with whitespace.");
    }

    public static IRuleBuilderOptions<T, List<string>> ValidRoles<T>(this IRuleBuilder<T, List<string>> rule)
    {
        return rule
            .NotNull()
            .Must(roles => roles is { Count: > 0 })
            .WithMessage("Select at least one role.")
            .Must(roles => roles is null || roles.All(role =>
                AssignableRoles.Contains(role, StringComparer.OrdinalIgnoreCase)))
            .WithMessage($"Roles must be one of: {string.Join(", ", AssignableRoles)}.");
    }
}

public sealed class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(request => request.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(request => request.FullName).NotEmpty().MaximumLength(200);
        RuleFor(request => request.Password).ValidPassword();
        RuleFor(request => request.Roles).ValidRoles();
        UserRules.VendorRules(this, request => request.Roles, request => request.CompanyId);
    }
}

public sealed class UpdateUserRequestValidator : AbstractValidator<UpdateUserRequest>
{
    public UpdateUserRequestValidator()
    {
        RuleFor(request => request.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(request => request.FullName).NotEmpty().MaximumLength(200);
        RuleFor(request => request.Roles).ValidRoles();
        UserRules.VendorRules(this, request => request.Roles, request => request.CompanyId);
    }
}

public sealed class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(request => request.NewPassword).ValidPassword();
    }
}

public sealed class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(request => request.CurrentPassword).NotEmpty();
        RuleFor(request => request.NewPassword)
            .ValidPassword()
            .NotEqual(request => request.CurrentPassword)
            .WithMessage("The new password must be different from the current password.");
    }
}
