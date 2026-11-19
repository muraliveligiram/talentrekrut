using Applications.Contracts;
using Domain.Entities;
using FluentValidation;

namespace Applications.Validators;

public class CandidateWriteRequestValidator<T> : AbstractValidator<T>
    where T : CandidateWriteRequest
{
    private const decimal MaxCtcLpa = 10_000;

    public CandidateWriteRequestValidator(TimeProvider timeProvider)
    {
        RuleFor(request => request.FullName).NotEmpty().MaximumLength(200);
        RuleFor(request => request.CurrentRole).NotEmpty().MaximumLength(200);
        RuleFor(request => request.CurrentCompany).NotEmpty().MaximumLength(200);
        RuleFor(request => request.Level).IsInEnum();
        RuleFor(request => request.DateOfBirth)
            .Must(dateOfBirth =>
            {
                var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
                return dateOfBirth <= today.AddYears(-16) && dateOfBirth >= today.AddYears(-80);
            })
            .WithMessage("Date of birth must make the candidate between 16 and 80 years old.");
        RuleFor(request => request.Phone)
            .NotEmpty()
            .MaximumLength(30)
            .Matches(@"^\+?[0-9\s\-()]{7,30}$")
            .WithMessage("Enter a valid phone number.")
            .Must(phone => CandidateRules.NormalizePhone(phone).Length is >= 7 and <= 15)
            .WithMessage("Enter a valid phone number.");
        RuleFor(request => request.PersonalEmail).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(request => request.CompanyEmail).EmailAddress().MaximumLength(200)
            .When(request => !string.IsNullOrWhiteSpace(request.CompanyEmail));
        RuleFor(request => request.CurrentCtcLpa).InclusiveBetween(0, MaxCtcLpa);
        RuleFor(request => request.ExpectedCtcLpa).InclusiveBetween(0, MaxCtcLpa);
        RuleFor(request => request.VariablePayLpa)
            .InclusiveBetween(0, MaxCtcLpa)
            .When(request => request.VariablePayLpa.HasValue);
        RuleFor(request => request)
            .Must(request => !request.VariablePayLpa.HasValue
                || (request.CurrentCtcIncludesVariable && request.VariablePayLpa <= request.CurrentCtcLpa))
            .WithName(nameof(CandidateWriteRequest.VariablePayLpa))
            .WithMessage("Variable pay must be part of, and not exceed, the current CTC.");
        RuleFor(request => request.NoticePeriodDays).InclusiveBetween(0, 365);
        RuleFor(request => request.LinkedInUrl)
            .MaximumLength(300)
            .Must(url => Uri.TryCreate(url, UriKind.Absolute, out var uri)
                && uri.Scheme is "http" or "https"
                && uri.Host.EndsWith("linkedin.com", StringComparison.OrdinalIgnoreCase))
            .When(request => !string.IsNullOrWhiteSpace(request.LinkedInUrl))
            .WithMessage("Enter a full LinkedIn profile URL, e.g. https://www.linkedin.com/in/name.");
        RuleFor(request => request.Notes).MaximumLength(4000);
    }
}

public sealed class CreateCandidateRequestValidator(TimeProvider timeProvider)
    : CandidateWriteRequestValidator<CreateCandidateRequest>(timeProvider);

public sealed class UpdateCandidateRequestValidator(TimeProvider timeProvider)
    : CandidateWriteRequestValidator<CandidateWriteRequest>(timeProvider);

public static class CandidateRules
{
    public static string NormalizePhone(string phone) => new(phone.Where(char.IsDigit).ToArray());
    public static string NormalizeEmail(string email) => email.Trim().ToUpperInvariant();
}

public sealed class ScreeningDecisionRequestValidator : AbstractValidator<ScreeningDecisionRequest>
{
    public ScreeningDecisionRequestValidator()
    {
        RuleForEach(request => request.RejectionReasons).IsInEnum();
        RuleFor(request => request.RejectionReasons)
            .Must(reasons => reasons.Count == 0)
            .When(request => request.Shortlisted)
            .WithMessage("Rejection reasons apply only when the candidate is not shortlisted.");
        RuleFor(request => request.Notes)
            .NotEmpty()
            .When(request => request.RejectionReasons.Contains(RejectionReason.Other))
            .WithMessage("Describe the reason when selecting \"Other\".");
        RuleFor(request => request.Notes).MaximumLength(2000);
    }
}

public sealed class ScheduleInterviewRequestValidator : AbstractValidator<ScheduleInterviewRequest>
{
    public ScheduleInterviewRequestValidator(TimeProvider timeProvider)
    {
        RuleFor(request => request.ScheduledAt)
            .Must(scheduledAt => scheduledAt > timeProvider.GetUtcNow())
            .WithMessage("The interview must be scheduled in the future.");
        RuleFor(request => request.Notes).MaximumLength(2000);
    }
}

public sealed class InterviewOutcomeRequestValidator : AbstractValidator<InterviewOutcomeRequest>
{
    public InterviewOutcomeRequestValidator()
    {
        RuleForEach(request => request.RejectionReasons).IsInEnum();
        RuleFor(request => request.RejectionReasons)
            .NotEmpty()
            .When(request => !request.Passed)
            .WithMessage("Select at least one rejection reason.");
        RuleFor(request => request.RejectionReasons)
            .Empty()
            .When(request => request.Passed)
            .WithMessage("Rejection reasons apply only when the candidate does not clear the round.");
        RuleFor(request => request.Notes)
            .NotEmpty()
            .When(request => request.RejectionReasons.Contains(RejectionReason.Other))
            .WithMessage("Describe the reason when selecting \"Other\".");
        RuleFor(request => request.Notes).MaximumLength(2000);
    }
}

public sealed class JoiningDateRequestValidator : AbstractValidator<JoiningDateRequest>
{
    public JoiningDateRequestValidator(TimeProvider timeProvider)
    {
        RuleFor(request => request.JoiningDate)
            .Must(date =>
            {
                var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
                return date >= today.AddDays(-90) && date <= today.AddYears(1);
            })
            .WithMessage("The joining date must be within the last 90 days or the next year.");
        RuleFor(request => request.Notes).MaximumLength(2000);
    }
}

public sealed class JoiningOutcomeRequestValidator : AbstractValidator<JoiningOutcomeRequest>
{
    public JoiningOutcomeRequestValidator()
    {
        RuleForEach(request => request.NotJoiningReasons).IsInEnum();
        RuleFor(request => request.NotJoiningReasons)
            .NotEmpty()
            .When(request => !request.Joined)
            .WithMessage("Select at least one reason for not joining.");
        RuleFor(request => request.NotJoiningReasons)
            .Empty()
            .When(request => request.Joined)
            .WithMessage("Reasons apply only when the candidate did not join.");
        RuleFor(request => request.Notes)
            .NotEmpty()
            .When(request => request.NotJoiningReasons.Contains(NotJoiningReason.Other))
            .WithMessage("Describe the reason when selecting \"Other\".");
        RuleFor(request => request.Notes).MaximumLength(2000);
    }
}
