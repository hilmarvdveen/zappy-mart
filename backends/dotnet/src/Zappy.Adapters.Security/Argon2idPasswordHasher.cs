using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Konscious.Security.Cryptography;
using Zappy.Application;

namespace Zappy.Adapters.Security;

public sealed class Argon2idPasswordHasher(SecuritySettings settings) : IPasswordHasher
{
    private const int SaltLength = 16;

    private const int HashLength = 32;

    private const string Algorithm = "argon2id";

    private const string Version = "v=19";

    private const char Separator = '$';

    public string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltLength);
        var hash = Compute(
            password,
            salt,
            settings.Argon2MemoryKibibytes,
            settings.Argon2Iterations,
            settings.Argon2Parallelism);

        var parameters = string.Format(
            CultureInfo.InvariantCulture,
            "m={0},t={1},p={2}",
            settings.Argon2MemoryKibibytes,
            settings.Argon2Iterations,
            settings.Argon2Parallelism);

        var salted = Convert.ToBase64String(salt);
        var hashed = Convert.ToBase64String(hash);
        return string.Join(Separator, string.Empty, Algorithm, Version, parameters, salted, hashed);
    }

    public bool Matches(string password, string hash)
    {
        var parts = hash.Split(Separator, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 5 || parts[0] != Algorithm)
        {
            return false;
        }

        var chosen = parts[2].Split(',');
        if (chosen.Length != 3)
        {
            return false;
        }

        var memoryKibibytes = ValueOf(chosen[0]);
        var iterations = ValueOf(chosen[1]);
        var parallelism = ValueOf(chosen[2]);
        if (memoryKibibytes is null || iterations is null || parallelism is null)
        {
            return false;
        }

        var salt = Convert.FromBase64String(parts[3]);
        var stored = Convert.FromBase64String(parts[4]);
        var computed = Compute(password, salt, memoryKibibytes.Value, iterations.Value, parallelism.Value);
        return CryptographicOperations.FixedTimeEquals(stored, computed);
    }

    private static int? ValueOf(string setting) =>
        int.TryParse(setting.AsSpan(setting.IndexOf('=') + 1), CultureInfo.InvariantCulture, out var value)
            ? value
            : null;

    private static byte[] Compute(string password, byte[] salt, int memoryKibibytes, int iterations, int parallelism)
    {
        using var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password))
        {
            Salt = salt,
            MemorySize = memoryKibibytes,
            Iterations = iterations,
            DegreeOfParallelism = parallelism
        };

        return argon2.GetBytes(HashLength);
    }
}
