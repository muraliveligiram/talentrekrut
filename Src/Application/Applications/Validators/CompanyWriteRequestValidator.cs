using Applications.Contracts;
using FluentValidation;

namespace Applications.Validators;

public sealed class CompanyWriteRequestValidator : AbstractValidator<CompanyWriteRequest>
{
    public CompanyWriteRequestValidator()
    {
        RuleFor(request => request.Name)
            .NotEmpty()
            .MaximumLength(200);
        RuleFor(request => request.Industry).MaximumLength(100);
        RuleFor(request => request.Website)
            .MaximumLength(300)
            .Must(BeAbsoluteHttpUrl)
            .WithMessage("Website must be an absolute HTTP or HTTPS URL.");
        RuleFor(request => request.Address).MaximumLength(300);
        RuleFor(request => request.City).MaximumLength(100);
        RuleFor(request => request.State).MaximumLength(100);
        RuleFor(request => request.Country).MaximumLength(100);
        RuleFor(request => request.PostalCode).MaximumLength(30);
        RuleFor(request => request.ContactPersonName).MaximumLength(200);
        RuleFor(request => request.ContactEmail)
            .MaximumLength(200)
            .EmailAddress()
            .When(request => !string.IsNullOrWhiteSpace(request.ContactEmail));
        RuleFor(request => request.ContactPhone).MaximumLength(30);
        RuleFor(request => request.LogoPath).MaximumLength(500);
    }

    private static bool BeAbsoluteHttpUrl(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            || (Uri.TryCreate(value, UriKind.Absolute, out var uri)
                && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps));
    }
}
