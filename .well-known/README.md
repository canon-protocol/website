# Canon Protocol Verification Files

This directory contains verification files for Canon Protocol registries.

## File Format

Files follow the pattern: `canon-verify-{token}`

Where `{token}` is the unique verification token provided by each registry.

## Current Files

- `canon-verify-placeholder` - Placeholder file. Replace "placeholder" with actual token from spec.farm when registering.

## Adding New Registries

When registering with a new registry:
1. Registry provides a token (e.g., "abc123")
2. Create file `canon-verify-abc123` 
3. File content: `canon-verify=abc123`
4. Registry verifies at `https://canon-protocol.org/.well-known/canon-verify-abc123`

## Multiple Registry Support

You can maintain verification files for multiple registries simultaneously. Each registry only checks for its specific token file.