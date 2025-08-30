const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { execSync } = require('child_process');
const { generateMarkdown } = require('./spec-to-markdown');

const CANON_REPO_PATH = path.join(process.cwd(), 'canon-specs');
const CANON_REPO_URL = 'https://github.com/canon-protocol/canon.git';
const DOCS_OUTPUT_PATH = path.join(process.cwd(), 'docs'); // Generate directly in docs folder

// Semantic version comparison
function compareVersions(a, b) {
  const parseVersion = (v) => {
    const match = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) return { major: 0, minor: 0, patch: 0, prerelease: v };
    return {
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: parseInt(match[3]),
      prerelease: match[4] || ''
    };
  };
  
  const va = parseVersion(a);
  const vb = parseVersion(b);
  
  if (va.major !== vb.major) return vb.major - va.major;
  if (va.minor !== vb.minor) return vb.minor - va.minor;
  if (va.patch !== vb.patch) return vb.patch - va.patch;
  
  // Handle pre-release versions
  if (va.prerelease && !vb.prerelease) return 1;
  if (!va.prerelease && vb.prerelease) return -1;
  if (va.prerelease && vb.prerelease) {
    return va.prerelease.localeCompare(vb.prerelease);
  }
  
  return 0;
}

// Determine if a version is stable
function isStableVersion(version) {
  const parsed = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!parsed) return false;
  const major = parseInt(parsed[1]);
  const hasPrerelease = !!parsed[4];
  return major > 0 && !hasPrerelease;
}

// Ensure output directory exists
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Clone or update the canon repository
function ensureCanonRepository() {
  if (!fs.existsSync(CANON_REPO_PATH)) {
    console.log('📦 Canon repository not found locally. Cloning from GitHub...');
    try {
      execSync(`git clone ${CANON_REPO_URL} ${CANON_REPO_PATH}`, { stdio: 'inherit' });
      console.log('✅ Successfully cloned Canon repository\n');
    } catch (error) {
      console.error('❌ Failed to clone Canon repository:', error.message);
      console.error('   Please ensure git is installed and you have internet connectivity.');
      process.exit(1);
    }
  } else {
    console.log('📦 Canon repository found locally.');
    // Optionally update the repository
    try {
      console.log('🔄 Pulling latest changes...');
      execSync('git pull', { cwd: CANON_REPO_PATH, stdio: 'inherit' });
      console.log('✅ Repository updated\n');
    } catch (error) {
      console.warn('⚠️  Could not update repository (may be offline or have local changes)\n');
    }
  }
}

// Get all files in a specification directory
function getSpecificationFiles(specPath, specInfo) {
  const files = {};
  
  // Read all files from local directory
  const specDir = path.dirname(specPath);
  if (!fs.existsSync(specDir)) {
    console.warn(`    ⚠️  Directory not found: ${specDir}`);
    return files;
  }
  
  const items = fs.readdirSync(specDir);
  for (const item of items) {
    const filePath = path.join(specDir, item);
    const stat = fs.statSync(filePath);
    if (!stat.isDirectory()) {
      try {
        files[item] = fs.readFileSync(filePath, 'utf8');
      } catch (error) {
        console.warn(`    ⚠️  Error reading ${item}: ${error.message}`);
      }
    }
  }
  
  return files;
}

// Walk directory tree to find all canon.yml files
function findCanonSpecs(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findCanonSpecs(fullPath, files);
    } else if (item === 'canon.yml' || item === 'canon.yaml') {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Extract spec metadata from file path
function extractSpecInfo(specPath) {
  const relativePath = path.relative(CANON_REPO_PATH, specPath);
  const parts = relativePath.split(path.sep);
  
  // Expected format: publisher/spec-name/version/canon.yml
  if (parts.length >= 3) {
    return {
      publisher: parts[0],
      specName: parts[1],
      version: parts[2],
      fullPath: specPath
    };
  }
  
  return null;
}

// Process all specifications
async function processSpecs() {
  console.log('🚀 Canon Protocol Documentation Generator');
  console.log('=========================================\n');
  
  // Ensure we have the Canon repository cloned locally
  ensureCanonRepository();
  
  console.log('🔍 Scanning for Canon specifications...');
  
  // Find all spec files locally
  const specFiles = findCanonSpecs(CANON_REPO_PATH);
  console.log(`📚 Found ${specFiles.length} specification file(s)\n`);
  
  if (specFiles.length === 0) {
    console.warn('⚠️  No specifications found. Please check the canon-specs directory.');
    return;
  }
  
  // Group specs by type and track all discoveries
  const specsByType = {};
  const specIndex = [];
  const typeHierarchy = {};
  const derivedTypes = {};
  
  // First pass: collect all specs and their metadata
  const allSpecs = [];
  
  for (const specFile of specFiles) {
    const specInfo = extractSpecInfo(specFile);
    if (!specInfo) {
      console.warn(`⚠️  Skipping ${specFile} - unexpected path structure`);
      continue;
    }
    
    try {
      const yamlContent = fs.readFileSync(specFile, 'utf8');
      const spec = yaml.load(yamlContent);
      spec._info = specInfo;
      allSpecs.push(spec);
      
      // Track type hierarchy
      if (spec.type) {
        typeHierarchy[`${specInfo.specName}@${specInfo.version}`] = spec.type;
        
        // Track derived types (reverse mapping)
        if (!derivedTypes[spec.type]) {
          derivedTypes[spec.type] = [];
        }
        derivedTypes[spec.type].push(`${specInfo.publisher}/${specInfo.specName}@${specInfo.version}`);
      }
      
      console.log(`  📄 Found: ${specInfo.publisher}/${specInfo.specName}@${specInfo.version}`);
    } catch (error) {
      console.error(`  ❌ Error reading ${specFile}:`, error.message);
    }
  }
  
  console.log('\n📊 Processing specifications...\n');
  
  // Sort specs based on page_order if present, then alphabetically
  allSpecs.sort((a, b) => {
    // Check if specs have page_order field
    const aHasOrder = typeof a.page_order === 'number';
    const bHasOrder = typeof b.page_order === 'number';
    
    // Both have page_order: sort by page_order ascending
    if (aHasOrder && bHasOrder) {
      return a.page_order - b.page_order;
    }
    
    // Only a has page_order: a comes first
    if (aHasOrder && !bHasOrder) {
      return -1;
    }
    
    // Only b has page_order: b comes first
    if (!aHasOrder && bHasOrder) {
      return 1;
    }
    
    // Neither has page_order: sort alphabetically by spec name
    return a._info.specName.localeCompare(b._info.specName);
  });
  
  // First pass: group all specs by type
  for (const spec of allSpecs) {
    const specInfo = spec._info;
    
    // Group by spec name
    if (!specsByType[specInfo.specName]) {
      specsByType[specInfo.specName] = [];
    }
    specsByType[specInfo.specName].push(spec);
  }
  
  // Sort versions for each spec type
  for (const specName in specsByType) {
    specsByType[specName].sort((a, b) => 
      compareVersions(a._info.version, b._info.version)
    );
  }
  
  // Second pass: generate markdown files with complete version information
  for (const spec of allSpecs) {
    const specInfo = spec._info;
    
    try {
      // Get all files for this specification
      const specFiles = getSpecificationFiles(specInfo.fullPath, specInfo);
      
      // Generate output path
      const outputDir = path.join(DOCS_OUTPUT_PATH, specInfo.specName);
      ensureDirectoryExists(outputDir);
      
      const outputFile = path.join(outputDir, `${specInfo.version}.md`);
      
      // Generate markdown with complete version list
      const allVersions = specsByType[specInfo.specName].map(s => s._info.version);
      const markdown = generateMarkdown(spec, specInfo, {
        allVersions,
        typeHierarchy,
        derivedTypes,
        sourceFiles: specFiles
      });
      fs.writeFileSync(outputFile, markdown);
      
      console.log(`  ✅ Generated: ${specInfo.specName}/${specInfo.version}`);
      
      // Add to index
      specIndex.push({
        name: specInfo.specName,
        version: specInfo.version,
        title: spec.metadata?.title || specInfo.specName,
        description: spec.metadata?.description || '',
        path: `specifications/${specInfo.specName}/${specInfo.version}`,
        type: spec.type,
        isStable: isStableVersion(specInfo.version)
      });
      
    } catch (error) {
      console.error(`  ❌ Error processing ${specInfo.specName}@${specInfo.version}:`, error.message);
    }
  }
  
  console.log('\n📝 Generating documentation index...\n');
  
  // Generate index page
  generateIndexPage(specIndex, specsByType);
  
  // Generate dynamic sidebars configuration
  generateSidebarsConfig(specsByType);
  
  // Don't generate category files anymore - using direct links
  // generateCategoryFiles(specsByType);
  
  // Don't generate version redirects - they clutter the sidebar
  // generateVersionRedirects(specsByType);
  
  // Print summary
  console.log('📈 Summary:');
  console.log('===========');
  for (const [specName, specs] of Object.entries(specsByType)) {
    const versions = specs.map(s => s._info.version);
    const latest = versions[0]; // Already sorted
    const stableVersions = versions.filter(isStableVersion);
    console.log(`  • ${specName}: ${versions.length} version(s)`);
    console.log(`    Latest: ${latest}${isStableVersion(latest) ? ' (stable)' : ' (pre-release)'}`);
    if (stableVersions.length > 0 && !isStableVersion(latest)) {
      console.log(`    Latest stable: ${stableVersions[0]}`);
    }
  }
  
  console.log('\n✨ Documentation generation complete!');
}

// Generate main specifications index page
function generateIndexPage(specs, specsByType) {
  ensureDirectoryExists(DOCS_OUTPUT_PATH);
  
  // Sort categories based on page_order of their latest version
  const categories = Object.keys(specsByType).sort((a, b) => {
    // Get the latest version of each spec type (first in the sorted array)
    const aLatest = specsByType[a][0];
    const bLatest = specsByType[b][0];
    
    // Check if specs have page_order field
    const aHasOrder = typeof aLatest.page_order === 'number';
    const bHasOrder = typeof bLatest.page_order === 'number';
    
    // Both have page_order: sort by page_order ascending
    if (aHasOrder && bHasOrder) {
      return aLatest.page_order - bLatest.page_order;
    }
    
    // Only a has page_order: a comes first
    if (aHasOrder && !bHasOrder) {
      return -1;
    }
    
    // Only b has page_order: b comes first
    if (!aHasOrder && bHasOrder) {
      return 1;
    }
    
    // Neither has page_order: sort alphabetically
    return a.localeCompare(b);
  });
  
  let markdown = `---
id: index
title: Canon Protocol
sidebar_label: Overview
sidebar_position: 1
custom_edit_url: null
---

# Canon Protocol Documentation

Welcome to the Canon Protocol documentation. Canon is a universal specification registry protocol that enables decentralized, interoperable management and distribution of specifications.

## Why "Canon"?

The name "Canon" comes from **canonicalization** — the process of converting data into a standard, canonical form. Just as canonicalization ensures consistent representation of information, Canon Protocol establishes a universal standard for defining, publishing, and sharing specifications. This creates a single source of truth for data structures, APIs, and protocols across different systems and organizations.

## What is Canon Protocol?

Canon Protocol provides a standardized way to:

- **Define** specifications using a universal schema format
- **Publish** specifications to decentralized registries
- **Discover** and retrieve specifications from any registry
- **Verify** authenticity through cryptographic signatures
- **Version** specifications with full compatibility tracking

## Key Concepts

### Specifications
A specification in Canon Protocol is a formal description of a data structure, API, or protocol. Each spec is:
- Versioned using semantic versioning
- Signed by its publisher
- Discoverable through registries
- Interoperable across ecosystems

### Registries
Registries are services that host and distribute Canon specifications. They can be:
- **Public** or **Private**
- **Read-only** or **Read-write**
- **Centralized** or **Decentralized**

### Publishers
Publishers are entities that create and sign specifications. Each publisher:
- Controls their own namespace
- Manages their signing keys
- Can publish to multiple registries

## Quick Start

### Prerequisites

The Canon CLI is written in Rust and distributed via Cargo. To install it, you'll need:

- **Rust** (1.70 or later) - [Install Rust](https://rustup.rs/)
- **Cargo** (comes with Rust)

### Installation

Once you have Rust installed, you can install the Canon CLI:

\`\`\`bash
cargo install canon-cli
\`\`\`

This will download, compile, and install the \`canon\` command to your system.

### Basic Usage

Initialize a new Canon project:

\`\`\`bash
canon init my-project
\`\`\`

Add a specification:

\`\`\`bash
canon add registry@1.0.0
\`\`\`

Publish your specifications:

\`\`\`bash
canon publish
\`\`\`

## Architecture Overview

\`\`\`
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Publisher  │────▶│   Registry   │◀────│  Consumer   │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │                     │
       ▼                    ▼                     ▼
  [Signs Specs]      [Stores Specs]       [Fetches Specs]
\`\`\`

## Why Canon Protocol?

### Universal Compatibility
Works with any specification format, programming language, or ecosystem.

### Decentralized by Design
No single point of control or failure. Publishers maintain sovereignty over their specifications.

### Cryptographically Secure
All specifications are signed and verified, ensuring authenticity and integrity.

### Version-Aware
Full semantic versioning support with compatibility tracking and dependency resolution.

## Resources

- [Canon CLI](https://github.com/canon-protocol/canon-cli) - Command-line tools
- [Canon Registry](https://github.com/canon-protocol/canon) - Official specification registry
- [GitHub Organization](https://github.com/canon-protocol) - Source code and issues
`;
  
  fs.writeFileSync(path.join(DOCS_OUTPUT_PATH, 'index.md'), markdown);
}

// Generate dynamic sidebars configuration
function generateSidebarsConfig(specsByType) {
  // Sort categories based on page_order of their latest version
  const sortedSpecs = Object.entries(specsByType)
    .map(([specName, specs]) => ({
      specName,
      latestSpec: specs[0],
      latestVersion: specs[0]._info.version
    }))
    .sort((a, b) => {
      // Check if specs have page_order field
      const aHasOrder = typeof a.latestSpec.page_order === 'number';
      const bHasOrder = typeof b.latestSpec.page_order === 'number';
      
      // Both have page_order: sort by page_order ascending
      if (aHasOrder && bHasOrder) {
        return a.latestSpec.page_order - b.latestSpec.page_order;
      }
      
      // Only a has page_order: a comes first
      if (aHasOrder && !bHasOrder) {
        return -1;
      }
      
      // Only b has page_order: b comes first
      if (!aHasOrder && bHasOrder) {
        return 1;
      }
      
      // Neither has page_order: sort alphabetically
      return a.specName.localeCompare(b.specName);
    });

  // Build the sidebar items
  const sidebarItems = [
    {
      type: 'doc',
      id: 'index',
      label: 'Overview',
    }
  ];

  // Add all specs in sorted order
  for (const { specName, latestSpec, latestVersion } of sortedSpecs) {
    sidebarItems.push({
      type: 'doc',
      id: `${specName}/${latestVersion}`,
      label: latestSpec.metadata?.title || specName,
    });
  }

  // Generate the TypeScript sidebars file
  const sidebarContent = `import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  // Main specification sidebar - dynamically generated based on page_order
  specSidebar: ${JSON.stringify(sidebarItems, null, 4).replace(/"([^"]+)":/g, '$1:').replace(/"/g, "'")},
};

export default sidebars;
`;

  // Write the sidebars configuration
  const sidebarPath = path.join(process.cwd(), 'sidebars.ts');
  fs.writeFileSync(sidebarPath, sidebarContent);
  console.log('📚 Generated dynamic sidebars configuration');
}

// Generate category files for sidebar organization
function generateCategoryFiles(specsByType) {
  for (const [specName, specs] of Object.entries(specsByType)) {
    const categoryDir = path.join(DOCS_OUTPUT_PATH, specName);
    ensureDirectoryExists(categoryDir);
    
    const latestSpec = specs[0];
    
    const category = {
      label: latestSpec.metadata?.title || specName,
      position: getPositionForSpec(specName, latestSpec),
      link: {
        type: 'generated-index',
        title: latestSpec.metadata?.title || specName,
        description: latestSpec.metadata?.description || `Specifications for ${specName}`,
        keywords: [specName, 'canon', 'protocol', 'specification']
      }
    };
    
    fs.writeFileSync(
      path.join(categoryDir, '_category_.json'),
      JSON.stringify(category, null, 2)
    );
  }
}

// Generate redirects from spec name to latest version
function generateVersionRedirects(specsByType) {
  for (const [specName, specs] of Object.entries(specsByType)) {
    const categoryDir = path.join(DOCS_OUTPUT_PATH, specName);
    const latestVersion = specs[0]._info.version;
    
    // Create a latest.md that redirects to the latest version
    const redirectContent = `---
id: latest
title: ${specs[0].metadata?.title || specName} (Latest)
sidebar_label: Latest
custom_edit_url: null
pagination_next: null
pagination_prev: null
---

import { Redirect } from '@docusaurus/router';

<Redirect to="${latestVersion}" />
`;
    
    fs.writeFileSync(
      path.join(categoryDir, 'latest.md'),
      redirectContent
    );
  }
}

// Determine sidebar position based on page_order or default
function getPositionForSpec(specName, spec) {
  // If spec has page_order, use it
  if (typeof spec?.page_order === 'number') {
    return spec.page_order;
  }
  
  // Otherwise return a high number so unordered specs come after ordered ones
  return 999;
}

// Run the processor
processSpecs().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});