using Microsoft.EntityFrameworkCore;

namespace Zappy.Adapters.Persistence;

public sealed class PostgreSqlZappyDbContext(DbContextOptions<PostgreSqlZappyDbContext> options) : ZappyDbContext(options);
