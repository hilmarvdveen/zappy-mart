using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Zappy.Application;

namespace Zappy.Application.Tests;

public sealed class CountingPasswordHasher : IPasswordHasher
{
    public int TimesHashed { get; private set; }

    public string Hash(string password)
    {
        TimesHashed += 1;
        return Digest(password);
    }

    public bool Matches(string password, string hash) => Digest(password) == hash;

    private static string Digest(string password) =>
        string.Create(
            CultureInfo.InvariantCulture,
            $"digest:{Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(password)))}");
}
