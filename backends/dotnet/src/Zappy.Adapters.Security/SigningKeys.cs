using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;

namespace Zappy.Adapters.Security;

public sealed class SigningKeys : IDisposable
{
    private readonly RSA rsa = RSA.Create(2048);

    public SigningKeys(SecuritySettings settings)
    {
        if (!string.IsNullOrWhiteSpace(settings.PrivateKeyPem))
        {
            rsa.ImportFromPem(settings.PrivateKeyPem);
        }

        Key = new RsaSecurityKey(rsa)
        {
            KeyId = Convert.ToHexString(SHA256.HashData(rsa.ExportRSAPublicKey()))[..16]
        };
    }

    public RsaSecurityKey Key { get; }

    public string PublicKeyPem => rsa.ExportSubjectPublicKeyInfoPem();

    public void Dispose() => rsa.Dispose();
}
