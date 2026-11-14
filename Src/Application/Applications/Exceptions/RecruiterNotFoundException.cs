namespace Applications.Exceptions;

public sealed class RecruiterNotFoundException()
    : Exception("The requested active recruiter was not found.")
{
}
