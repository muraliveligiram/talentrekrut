using Applications.Contracts;
using FluentValidation;

namespace Applications.Validators;

public sealed class CreateSkillsRequestValidator : AbstractValidator<CreateSkillsRequest>
{
    public CreateSkillsRequestValidator()
    {
        RuleFor(request => request.Names)
            .NotNull()
            .Must(names => names is { Count: > 0 } && names.Any(name => !string.IsNullOrWhiteSpace(name)))
            .WithMessage("Enter at least one skill name.")
            .Must(names => names is null || names.Count <= 100)
            .WithMessage("Add at most 100 skills at a time.");
        RuleForEach(request => request.Names)
            .MaximumLength(100)
            .WithMessage("Skill names must be 100 characters or fewer.");
        RuleFor(request => request.Category).IsInEnum();
    }
}

public sealed class UpdateSkillRequestValidator : AbstractValidator<UpdateSkillRequest>
{
    public UpdateSkillRequestValidator()
    {
        RuleFor(request => request.Name).NotEmpty().MaximumLength(100);
        RuleFor(request => request.Category).IsInEnum();
    }
}
