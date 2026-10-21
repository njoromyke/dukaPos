using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace DukaPoS.Infrastructure.Auth;

public interface IJwtTokenService
{
    string GenerateToken(Guid userId, string email, string role, string tenantId, Guid branchId, IEnumerable<string>? permissions = null);
    string GenerateRefreshToken();
}

public class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _config;

    public JwtTokenService(IConfiguration config)
    {
        _config = config;
    }

    public string GenerateToken(Guid userId, string email, string role, string tenantId, Guid branchId, IEnumerable<string>? permissions = null)
    {
        var secret = _config["Jwt:Key"]
                     ?? throw new InvalidOperationException("Jwt:Key is required.");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expiryMinutes = int.Parse(_config["Jwt:ExpiryMinutes"] ?? "480");

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim("role", role),
            new Claim("tenantId", tenantId),
            new Claim("branchId", branchId.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };
        foreach (var permission in permissions ?? [])
        {
            if (!string.IsNullOrWhiteSpace(permission))
                claims.Add(new Claim("permission", permission));
        }

        if (string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(role, "SuperAdmin", StringComparison.OrdinalIgnoreCase))
            claims.Add(new Claim("permission", "admin.portal.view"));

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "DukaPoS",
            audience: _config["Jwt:Audience"] ?? "DukaPoS",
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }
}
