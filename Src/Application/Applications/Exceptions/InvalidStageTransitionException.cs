namespace Applications.Exceptions;

public sealed class InvalidStageTransitionException(string message) : Exception(message);
