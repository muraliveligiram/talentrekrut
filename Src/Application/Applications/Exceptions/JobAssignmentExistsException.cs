namespace Applications.Exceptions;

public sealed class JobAssignmentExistsException()
    : Exception("The recruiter is already assigned to this job.")
{
}
