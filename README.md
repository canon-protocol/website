# Canon Protocol Website

This repository contains the source code for [canon-protocol.org](https://canon-protocol.org), the main website and publisher identity for the Canon Protocol organization.

## Purpose

This website serves as the publisher identity for canon-protocol.org, hosting the cryptographic public keys at `.well-known/canon-keys.json` that verify all specifications published by canon-protocol.org.

## Structure

```
website/
├── .well-known/
│   ├── canon-keys.json           # Public keys for signature verification
│   ├── canon-verify-{token}      # HTTPS-based publisher verification files
│   └── README.md                 # Instructions for verification files
├── index.html                    # Simple landing page
├── CNAME                         # GitHub Pages custom domain
└── README.md                     # This file
```

## Deployment

This site is deployed via GitHub Pages:

1. Push changes to the `main` branch
2. GitHub Pages automatically deploys from the root directory
3. The site is available at https://canon-protocol.org

## Publisher Keys

The `.well-known/canon-keys.json` file contains the public keys used to verify all Canon specifications signed by canon-protocol.org.

### Generating Keys

To generate real keys for production:

```bash
# Install Canon CLI
cargo install canon-cli

# Initialize as a publisher
canon publisher init canon-protocol.org

# This will generate:
# - Private key (keep secure, never commit)
# - Public key (add to .well-known/canon-keys.json)
```

### Key Format

```json
{
  "version": "1.0",
  "keys": {
    "canon-protocol.org/keys/2025": {
      "algorithm": "ed25519",
      "public_key": "BASE64_ENCODED_PUBLIC_KEY",
      "created_at": "2025-01-01T00:00:00Z",
      "expires_at": "2026-01-01T00:00:00Z",
      "revoked": false,
      "usage": "signing"
    }
  },
  "revoked_keys": {}
}
```

### Security Notes

- **NEVER** commit private keys to this repository
- Store private keys securely (e.g., GitHub Secrets for CI/CD)
- Rotate keys annually or if compromised
- Add old keys to `revoked_keys` when rotating

## Verification

Canon Protocol registries verify publisher identity through:

1. **HTTPS Verification** - Fetches `.well-known/canon-verify-{token}` from the publisher's domain
2. **Public Key Verification** - Uses keys from `.well-known/canon-keys.json` to verify signatures

### Multi-Registry Support

This publisher can be verified by multiple registries simultaneously:
- Each registry provides a unique token (e.g., "abc123")
- Create file `.well-known/canon-verify-abc123` containing `canon-verify=abc123`
- Registries only check for their specific token file
- No information leakage between registries

## Local Development

To test locally:

```bash
# Using Python's built-in server
python3 -m http.server 8000

# Or using Node.js
npx http-server

# Visit http://localhost:8000
```

## Related Repositories

- [canon-protocol](https://github.com/canon-protocol/canon-protocol) - Main specification
- [canon-cli](https://github.com/canon-protocol/canon-cli) - Command-line tool
- [spec.farm](https://github.com/canon-protocol/spec.farm) - Canon Protocol Registry

## License

This project is part of the Canon Protocol ecosystem. See the main repository for license information.
