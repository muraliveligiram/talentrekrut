namespace Applications.Exceptions;

public sealed class DuplicateEmailException : Exception
{
    public DuplicateEmailException()
        : base("A user with this email address already exists.")
    {
    }
}
