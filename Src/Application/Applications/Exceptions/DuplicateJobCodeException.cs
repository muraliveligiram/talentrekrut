namespace Applications.Exceptions;

public sealed class DuplicateJobCodeException()
    : Exception("A job with this generated code already exists.")
{
}
