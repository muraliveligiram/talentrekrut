using Domain.Entities;

namespace Applications.Abstractions;

public interface IPasswordHashService
{
    string HashPassword(User user, string password);
    bool VerifyPassword(User user, string password);
}
