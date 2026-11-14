namespace Applications.Exceptions;

public sealed class CompanyNotFoundException()
    : Exception("The requested active company was not found.")
{
}
