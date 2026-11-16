using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Applications.Exceptions;
using FluentValidation;

namespace API.Infrastructure;

public sealed class GlobalExceptionHandler(
    ILogger<GlobalExceptionHandler> logger,
    IProblemDetailsService problemDetailsService) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (statusCode, title) = exception switch
        {
            ValidationException => (
                StatusCodes.Status400BadRequest,
                "One or more validation errors occurred."),
            DuplicateCompanyNameException => (
                StatusCodes.Status409Conflict,
                exception.Message),
            CompanyHasActiveJobsException => (
                StatusCodes.Status409Conflict,
                exception.Message),
            CompanyNotFoundException or RecruiterNotFoundException => (
                StatusCodes.Status404NotFound,
                exception.Message),
            DuplicateCandidateException or ApplicationExistsException or InvalidStageTransitionException
                or JobNotOpenException => (
                StatusCodes.Status409Conflict,
                exception.Message),
            JobNotFoundException => (
                StatusCodes.Status404NotFound,
                exception.Message),
            DuplicateEmailException or SelfLockoutException or DuplicateSkillException => (
                StatusCodes.Status409Conflict,
                exception.Message),
            InvalidCurrentPasswordException => (
                StatusCodes.Status400BadRequest,
                exception.Message),
            JobAssignmentExistsException or DuplicateJobCodeException => (
                StatusCodes.Status409Conflict,
                exception.Message),
            _ => (
                StatusCodes.Status500InternalServerError,
                "An unexpected error occurred.")
        };
        if (statusCode >= StatusCodes.Status500InternalServerError)
        {
            logger.LogError(exception, "Unhandled exception processing {Path}", httpContext.Request.Path);
        }

        httpContext.Response.StatusCode = statusCode;

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Instance = httpContext.Request.Path
        };
        if (exception is ValidationException validationException)
        {
            problemDetails.Extensions["errors"] = validationException.Errors
                .GroupBy(error => error.PropertyName)
                .ToDictionary(
                    group => group.Key,
                    group => group.Select(error => error.ErrorMessage).ToArray());
        }

        if (exception is DuplicateCandidateException duplicate)
        {
            problemDetails.Extensions["existingCandidateId"] = duplicate.ExistingCandidateId;
        }

        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problemDetails,
            Exception = exception
        });
    }
}
