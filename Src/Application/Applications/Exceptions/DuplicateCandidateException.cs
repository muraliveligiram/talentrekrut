namespace Applications.Exceptions;

public sealed class DuplicateCandidateException(long existingCandidateId, string field) : Exception(
    $"A candidate with this {field} already exists.")
{
    public long ExistingCandidateId { get; } = existingCandidateId;
}
