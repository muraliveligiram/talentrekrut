using Domain.Entities;
using Applications.Contracts;

namespace Applications.Abstractions;

public interface IJwtTokenGenerator
{
    AuthToken Generate(User user, IReadOnlyCollection<string> roles);
}
