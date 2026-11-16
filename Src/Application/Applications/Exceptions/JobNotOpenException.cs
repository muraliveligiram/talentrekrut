namespace Applications.Exceptions;

public sealed class JobNotOpenException() : Exception("Candidates can only be submitted to jobs that are open.");
