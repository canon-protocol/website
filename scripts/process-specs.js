const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { generateMarkdown } = require('./spec-to-markdown');

const CANON_REPO_PATH = path.join(process.cwd(), 'canon-specs');
const DOCS_OUTPUT_PATH = path.join(process.cwd(), 'docs', 'specifications');

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
  console.log('🔍 Searching for Canon specifications...');
  
  // Find all spec files
  const specFiles = findCanonSpecs(CANON_REPO_PATH);
  console.log(`📚 Found ${specFiles.length} specification file(s)\n`);
  
  // Group specs by type and track all discoveries
  const specsByType = {};
  const specIndex = [];
  const typeHierarchy = {};
  
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
      }
      
      console.log(`  📄 Discovered: ${specInfo.publisher}/${specInfo.specName}@${specInfo.version}`);
    } catch (error) {
      console.error(`  ❌ Error reading ${specFile}:`, error.message);
    }
  }
  
  console.log('\n📊 Processing specifications...\n');
  
  // Sort specs to process 'type' first, then 'canon-protocol', then others
  allSpecs.sort((a, b) => {
    const priority = { 'type': 0, 'canon-protocol': 1 };
    const aPriority = priority[a._info.specName] ?? 99;
    const bPriority = priority[b._info.specName] ?? 99;
    return aPriority - bPriority;
  });
  
  // Process all specs
  for (const spec of allSpecs) {
    const specInfo = spec._info;
    
    try {
      // Group by spec name
      if (!specsByType[specInfo.specName]) {
        specsByType[specInfo.specName] = [];
      }
      specsByType[specInfo.specName].push(spec);
      
      // Generate output path
      const outputDir = path.join(DOCS_OUTPUT_PATH, specInfo.specName);
      ensureDirectoryExists(outputDir);
      
      const outputFile = path.join(outputDir, `${specInfo.version}.md`);
      
      // Generate markdown with enhanced metadata
      const markdown = generateMarkdown(spec, specInfo, {
        allVersions: specsByType[specInfo.specName]?.map(s => s._info.version) || [specInfo.version],
        typeHierarchy
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
  
  // Sort versions for each spec type
  for (const specName in specsByType) {
    specsByType[specName].sort((a, b) => 
      compareVersions(a._info.version, b._info.version)
    );
  }
  
  console.log('\n📝 Generating documentation index...\n');
  
  // Generate index page
  generateIndexPage(specIndex, specsByType);
  
  // Generate category files for each spec type
  generateCategoryFiles(specsByType);
  
  // Generate version redirects for latest versions
  generateVersionRedirects(specsByType);
  
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
  
  const categories = Object.keys(specsByType).sort((a, b) => {
    // Sort with type first, then canon-protocol, then others
    const priority = { 'type': 0, 'canon-protocol': 1 };
    const aPriority = priority[a] ?? 99;
    const bPriority = priority[b] ?? 99;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.localeCompare(b);
  });
  
  let markdown = `---
id: specifications
title: Canon Protocol Specifications
sidebar_label: Overview
sidebar_position: 1
---

# Canon Protocol Specifications

The Canon Protocol defines a universal specification registry system. These specifications describe the core components and schemas that make up the protocol.

## Core Specifications

`;

  // Add special section for type (the meta-type)
  if (specsByType['type']) {
    const typeSpecs = specsByType['type'];
    const latestType = typeSpecs[0];
    markdown += `### 📐 Type (Meta-Type)

The foundational type from which all other Canon types derive. This is the meta-type that defines how types themselves are created.

${latestType.metadata?.description || 'The canonical type definition for Canon Protocol types.'}

**Versions:** ${typeSpecs.map(s => {
      const v = s._info.version;
      const label = v === typeSpecs[0]._info.version ? `**${v}** (latest)` : v;
      return `[${label}](type/${v})`;
    }).join(' • ')}

---

`;
  }

  markdown += `## All Specifications

`;

  for (const category of categories) {
    if (category === 'type') continue; // Already shown above
    
    const categorySpecs = specsByType[category];
    const latestSpec = categorySpecs[0];
    const latestVersion = latestSpec._info.version;
    const stableVersions = categorySpecs.filter(s => isStableVersion(s._info.version));
    
    markdown += `### ${latestSpec.metadata?.title || category}

${latestSpec.metadata?.description || ''}

`;
    
    // Show version info
    if (isStableVersion(latestVersion)) {
      markdown += `**Latest:** v${latestVersion} (stable)\n\n`;
    } else {
      markdown += `**Latest:** v${latestVersion} (pre-release)\n`;
      if (stableVersions.length > 0) {
        markdown += `**Latest stable:** v${stableVersions[0]._info.version}\n`;
      }
      markdown += '\n';
    }
    
    markdown += `**All versions:** ${categorySpecs.map(s => {
      const v = s._info.version;
      const label = v === latestVersion ? `**${v}**` : v;
      return `[${label}](${category}/${v})`;
    }).join(' • ')}

---

`;
  }
  
  markdown += `## Type Hierarchy

\`\`\`
type (meta-type)
├── canon-protocol
├── registry
├── project
├── protocol
└── canon-protocol-registry
\`\`\`

## About Canon Protocol

Canon Protocol provides a decentralized, interoperable system for managing and distributing specifications across different registries and ecosystems.

### Key Features

- **Universal Compatibility**: Works with any specification format
- **Decentralized**: No single point of control
- **Versioned**: Full version history and compatibility tracking
- **Signed**: Cryptographic signatures ensure authenticity
- **Discoverable**: Built-in discovery and search capabilities

### Getting Started

To use Canon Protocol specifications:

1. Install the Canon CLI: \`cargo install canon-cli\`
2. Initialize your project: \`canon init\`
3. Add specifications: \`canon add <spec>\`

For more information, see our [Getting Started Guide](/docs/intro).
`;
  
  fs.writeFileSync(path.join(DOCS_OUTPUT_PATH, 'index.md'), markdown);
}

// Generate category files for sidebar organization
function generateCategoryFiles(specsByType) {
  for (const [specName, specs] of Object.entries(specsByType)) {
    const categoryDir = path.join(DOCS_OUTPUT_PATH, specName);
    ensureDirectoryExists(categoryDir);
    
    const latestSpec = specs[0];
    
    const category = {
      label: latestSpec.metadata?.title || specName,
      position: getPositionForSpec(specName),
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

// Determine sidebar position based on spec type
function getPositionForSpec(specName) {
  const order = {
    'type': 1,  // Meta-type comes first
    'canon-protocol': 2,
    'canon-protocol-registry': 3,
    'registry': 4,
    'project': 5,
    'protocol': 6
  };
  return order[specName] || 99;
}

// Run the processor
processSpecs().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});