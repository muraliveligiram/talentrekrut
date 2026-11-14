namespace Applications.Exceptions;

public sealed class CompanyHasActiveJobsException()
    : Exception("A company with active jobs cannot be deleted.")
{
}
