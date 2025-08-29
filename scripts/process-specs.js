const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { generateMarkdown } = require('./spec-to-markdown');

const CANON_REPO_PATH = path.join(process.cwd(), 'canon-specs');
const DOCS_OUTPUT_PATH = path.join(process.cwd(), 'docs', 'specifications');

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
  console.log('🔍 Searching for Canon specifications...');
  
  // Find all spec files
  const specFiles = findCanonSpecs(CANON_REPO_PATH);
  console.log(`📚 Found ${specFiles.length} specification(s)`);
  
  // Group specs by type
  const specsByType = {};
  const specIndex = [];
  
  for (const specFile of specFiles) {
    const specInfo = extractSpecInfo(specFile);
    if (!specInfo) {
      console.warn(`⚠️  Skipping ${specFile} - unexpected path structure`);
      continue;
    }
    
    try {
      // Read and parse YAML
      const yamlContent = fs.readFileSync(specFile, 'utf8');
      const spec = yaml.load(yamlContent);
      
      // Add path info to spec
      spec._info = specInfo;
      
      // Group by spec name
      if (!specsByType[specInfo.specName]) {
        specsByType[specInfo.specName] = [];
      }
      specsByType[specInfo.specName].push(spec);
      
      // Generate output path
      const outputDir = path.join(DOCS_OUTPUT_PATH, specInfo.specName);
      ensureDirectoryExists(outputDir);
      
      const outputFile = path.join(outputDir, `${specInfo.version}.md`);
      
      // Generate markdown
      const markdown = generateMarkdown(spec, specInfo);
      fs.writeFileSync(outputFile, markdown);
      
      console.log(`✅ Generated ${specInfo.specName}/${specInfo.version}`);
      
      // Add to index
      specIndex.push({
        name: specInfo.specName,
        version: specInfo.version,
        title: spec.metadata?.title || specInfo.specName,
        description: spec.metadata?.description || '',
        path: `specifications/${specInfo.specName}/${specInfo.version}`
      });
      
    } catch (error) {
      console.error(`❌ Error processing ${specFile}:`, error.message);
    }
  }
  
  // Generate index page
  generateIndexPage(specIndex, specsByType);
  
  // Generate category files for each spec type
  generateCategoryFiles(specsByType);
  
  console.log('✨ Specification processing complete!');
}

// Generate main specifications index page
function generateIndexPage(specs, specsByType) {
  ensureDirectoryExists(DOCS_OUTPUT_PATH);
  
  const categories = Object.keys(specsByType).sort();
  
  let markdown = `---
id: specifications
title: Canon Protocol Specifications
sidebar_label: Overview
sidebar_position: 1
---

# Canon Protocol Specifications

The Canon Protocol defines a universal specification registry system. These specifications describe the core components and schemas that make up the protocol.

## Available Specifications

`;

  for (const category of categories) {
    const categorySpecs = specsByType[category];
    const latestSpec = categorySpecs[categorySpecs.length - 1];
    
    markdown += `### ${latestSpec.metadata?.title || category}

${latestSpec.metadata?.description || ''}

**Versions:** ${categorySpecs.map(s => `[${s._info.version}](${category}/${s._info.version})`).join(' • ')}

---

`;
  }
  
  markdown += `## About Canon Protocol

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
    
    const latestSpec = specs[specs.length - 1];
    
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

// Determine sidebar position based on spec type
function getPositionForSpec(specName) {
  const order = {
    'canon-protocol-registry': 1,
    'registry': 2,
    'project': 3,
    'type': 4
  };
  return order[specName] || 99;
}

// Run the processor
processSpecs().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});