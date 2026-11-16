namespace Applications.Exceptions;

public sealed class InvalidCurrentPasswordException : Exception
{
    public InvalidCurrentPasswordException()
        : base("The current password is incorrect.")
    {
    }
}
