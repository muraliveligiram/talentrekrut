using Applications.Contracts;
using Domain.Entities;
using FluentValidation;

namespace Applications.Validators;

public sealed class JobWriteRequestValidator : AbstractValidator<JobWriteRequest>
{
    public const int MaxInterviewRounds = 10;

    public JobWriteRequestValidator()
    {
        RuleFor(request => request.CompanyId).NotEmpty();
        RuleFor(request => request.Title).NotEmpty().MaximumLength(200);
        RuleFor(request => request.MinExperienceYears).GreaterThanOrEqualTo(0);
        RuleFor(request => request.MaxExperienceYears).GreaterThanOrEqualTo(0);
        RuleFor(request => request)
            .Must(request => request.MinExperienceYears <= request.MaxExperienceYears)
            .WithMessage("Minimum experience must not exceed maximum experience.");
        RuleFor(request => request.Openings).GreaterThanOrEqualTo(1);
        RuleFor(request => request.Location).MaximumLength(200);
        RuleFor(request => request.EmploymentType).IsInEnum();
        RuleFor(request => request.WorkMode).IsInEnum();
        RuleFor(request => request.CommunicationRequirement).MaximumLength(500);
        RuleFor(request => request.Skills)
            .NotNull()
            .Must(skills => skills is not null
                && skills.Any(skill => skill.SkillType == JobSkillType.Primary))
            .WithMessage("At least one primary skill is required.");
        RuleFor(request => request.Skills)
            .Must(skills => skills is null || skills.Select(skill => skill.SkillId).Distinct().Count() == skills.Count)
            .WithMessage("Each skill can only be added once.");
        RuleFor(request => request.Skills)
            .Must(skills => skills is null || skills.Count <= 50)
            .WithMessage("A job can have at most 50 skills.");
        RuleForEach(request => request.Skills).SetValidator(new JobSkillWriteRequestValidator());
        RuleFor(request => request.InterviewRounds)
            .NotNull()
            .Must(rounds => rounds is { Count: >= 1 and <= MaxInterviewRounds })
            .WithMessage($"Add between 1 and {MaxInterviewRounds} interview rounds.")
            .Must(rounds => rounds is null
                || rounds.Select(round => round?.Trim().ToUpperInvariant()).Distinct().Count() == rounds.Count)
            .WithMessage("Each interview round needs a different name.");
        RuleForEach(request => request.InterviewRounds)
            .NotEmpty()
            .WithMessage("Name every interview round.")
            .MaximumLength(100)
            .WithMessage("Round names must be 100 characters or fewer.");
    }

    private sealed class JobSkillWriteRequestValidator : AbstractValidator<JobSkillWriteRequest>
    {
        public JobSkillWriteRequestValidator()
        {
            RuleFor(skill => skill.SkillId).GreaterThan(0);
            RuleFor(skill => skill.SkillType).IsInEnum();
            RuleFor(skill => skill.MinYears).GreaterThanOrEqualTo(0);
        }
    }
}
