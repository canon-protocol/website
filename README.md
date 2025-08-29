# Canon Protocol Documentation Website

This repository contains the documentation website for Canon Protocol. It automatically fetches and displays the latest specifications from the [canon-protocol/canon](https://github.com/canon-protocol/canon) repository.

## Overview

This is a **documentation-only** repository that:
- Uses Docusaurus as the static site generator
- Automatically fetches Canon Protocol specifications during the build process
- Generates documentation pages from those specifications
- Deploys to GitHub Pages at https://canon-protocol.org

**Important:** This repository does NOT contain the actual specifications. Those live in the [canon-protocol/canon](https://github.com/canon-protocol/canon) repository. The specifications are fetched dynamically during the build process.

## Installation

```bash
yarn
```

## Local Development

### Testing the Documentation Site

```bash
yarn start
```

This starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Testing Specification Generation

To test the specification documentation generation locally:

```bash
# Clone the canon repository (temporary, don't commit)
git clone https://github.com/canon-protocol/canon.git canon-specs

# Generate the documentation
node scripts/process-specs.js

# Start the dev server to see the results
yarn start

# Clean up when done (specs are git-ignored but good practice)
rm -rf canon-specs docs/specifications/*
```

**Note:** The `canon-specs/` directory and `docs/specifications/` content are git-ignored and should never be committed.

## Build

```bash
yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

The site is automatically deployed via GitHub Actions when changes are pushed to the main branch or when manually triggered. The workflow:

1. Clones the latest specifications from `canon-protocol/canon`
2. Runs `scripts/process-specs.js` to generate documentation
3. Builds the static site with Docusaurus
4. Deploys to GitHub Pages

### Manual Deployment

For manual deployment to GitHub Pages:

```bash
# Using SSH
USE_SSH=true yarn deploy

# Not using SSH
GIT_USER=<Your GitHub username> yarn deploy
```

## Architecture

```
website/                          # This repository
├── docs/                        # Static documentation content
│   ├── intro.md                # Hand-written docs
│   └── specifications/          # Generated (git-ignored)
├── scripts/
│   ├── process-specs.js        # Fetches specs and generates docs
│   └── spec-to-markdown.js     # Converts specs to markdown
├── .github/workflows/
│   └── deploy.yml              # Automated build and deploy
└── docusaurus.config.ts        # Site configuration

canon/                           # Separate repository (canon-protocol/canon)
└── canon-protocol.org/         # Actual specification files
    ├── type/
    │   └── 0.1.0/
    │       ├── canon.yml
    │       └── specification.md
    └── ...
```

## Key Points

- **Specifications are NOT stored here** - they live in `canon-protocol/canon`
- **Documentation is generated at build time** - not committed to the repo
- **GitHub Actions handles everything** - cloning specs, generating docs, deploying
- **Local testing is possible** - but remember to clean up generated files
