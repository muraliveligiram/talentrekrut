using System.Linq.Expressions;

namespace Applications.Abstractions;

public interface IGenericRepository<TEntity>
    where TEntity : class
{
    Task<IReadOnlyList<TEntity>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TEntity>> FindAllAsync(
        Expression<Func<TEntity, bool>> predicate,
        CancellationToken cancellationToken = default);

    ValueTask<TEntity?> FindAsync(
        object?[] keyValues,
        CancellationToken cancellationToken = default);

    Task<TEntity> SaveAsync(TEntity entity, CancellationToken cancellationToken = default);

    Task<TEntity> UpdateAsync(TEntity entity, CancellationToken cancellationToken = default);
}
