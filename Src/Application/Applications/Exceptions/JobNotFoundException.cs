namespace Applications.Exceptions;

public sealed class JobNotFoundException() : Exception("The selected job does not exist or is not assigned to you.");
