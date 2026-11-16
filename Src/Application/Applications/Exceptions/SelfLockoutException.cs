namespace Applications.Exceptions;

public sealed class SelfLockoutException : Exception
{
    public SelfLockoutException()
        : base("You cannot deactivate your own account or remove your own Admin role.")
    {
    }
}
