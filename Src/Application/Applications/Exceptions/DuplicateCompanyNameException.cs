namespace Applications.Exceptions;

public sealed class DuplicateCompanyNameException : Exception
{
    public DuplicateCompanyNameException()
        : base("A company with this name already exists.")
    {
    }
}
