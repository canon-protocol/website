function generateMarkdown(spec, specInfo, context = {}) {
  const { metadata, schema, includes } = spec;
  const { allVersions = [], typeHierarchy = {}, sourceFiles = {} } = context;
  
  // Determine if this is the latest version using semantic versioning
  const sortedVersions = [...allVersions].sort((a, b) => {
    const parseVer = (v) => v.split('.').map(n => parseInt(n, 10));
    const va = parseVer(a);
    const vb = parseVer(b);
    for (let i = 0; i < 3; i++) {
      if (va[i] !== vb[i]) return vb[i] - va[i];
    }
    return 0;
  });
  const isLatest = sortedVersions[0] === specInfo.version;
  
  // Generate frontmatter
  const frontmatter = `---
id: ${specInfo.version}
title: ${metadata?.title || specInfo.specName} v${specInfo.version}
sidebar_label: ${metadata?.title || specInfo.specName}
sidebar_position: ${isLatest ? 1 : 2}
hide_table_of_contents: false
custom_edit_url: null
---`;

  // Generate header with enhanced type information
  const header = `
# ${metadata?.title || specInfo.specName}

${generateVersionBadge(specInfo.version, isLatest)}

**Publisher:** ${specInfo.publisher}  
**Type:** ${formatTypeReference(spec.type, true)}  
${includes ? `**Composes:** ${formatIncludes(includes, true)}  ` : ''}

${metadata?.description || ''}
`;

  // Generate version navigation
  const versionNav = generateVersionNavigation(specInfo, allVersions);
  
  // Generate type hierarchy section
  const typeHierarchySection = generateTypeHierarchySection(spec, specInfo, context);
  
  // Generate metadata section
  const metadataSection = generateMetadataSection(metadata);
  
  // Generate schema section
  const schemaSection = generateSchemaSection(schema);
  
  // Generate examples section
  const examplesSection = generateExamplesSection(spec);
  
  // Generate source files section
  const sourceFilesSection = generateSourceFilesSection(sourceFiles, specInfo);
  
  // Combine all sections
  return `${frontmatter}

${header}

${versionNav}

${typeHierarchySection}

${metadataSection}

${schemaSection}

${examplesSection}

${sourceFilesSection}
`;
}

function generateVersionBadge(version, isLatest) {
  const badges = [];
  
  // Version badge
  badges.push(`![Version](https://img.shields.io/badge/version-${version}-blue)`);
  
  // Latest badge
  if (isLatest) {
    badges.push(`![Latest](https://img.shields.io/badge/latest-✓-green)`);
  }
  
  // Stability badge
  const isStable = version.match(/^\d+\.\d+\.\d+$/) && !version.startsWith('0.');
  if (isStable) {
    badges.push(`![Stable](https://img.shields.io/badge/stability-stable-green)`);
  } else {
    badges.push(`![Pre-release](https://img.shields.io/badge/stability-pre--release-orange)`);
  }
  
  return badges.join(' ');
}

function formatTypeReference(type, asLink = false) {
  if (!type) return 'N/A';
  
  // Parse the type URI
  const typeMatch = type.match(/([^/]+)\/([^@]+)@(.+)/);
  if (!typeMatch) {
    return `\`${type}\``;
  }
  
  const [, publisher, typeName, version] = typeMatch;
  const isMetaType = type.includes('canon-protocol.org/type@');
  
  if (asLink) {
    // Create a relative link to the specification
    const link = `/${typeName}/${version}`;
    const label = isMetaType ? `${type} (meta-type)` : type;
    return `[\`${label}\`](${link})`;
  }
  
  // Non-link format
  if (isMetaType) {
    return `\`${type}\` (meta-type)`;
  }
  
  return `\`${type}\``;
}

function formatIncludes(includes, asLink = false) {
  if (!includes || includes.length === 0) return '';
  
  const formatted = includes.map(inc => formatTypeReference(inc, asLink)).join(', ');
  return formatted;
}

function generateVersionNavigation(specInfo, allVersions) {
  if (allVersions.length <= 1) return '';
  
  // Sort versions (highest first)
  const sortedVersions = [...allVersions].sort((a, b) => {
    // Parse semantic versions properly
    const parseVer = (v) => v.split('.').map(n => parseInt(n, 10));
    const va = parseVer(a);
    const vb = parseVer(b);
    for (let i = 0; i < 3; i++) {
      if (va[i] !== vb[i]) return vb[i] - va[i];
    }
    return 0;
  });
  
  const isLatest = sortedVersions[0] === specInfo.version;
  
  // Only show version info if there are multiple versions
  let nav = '';
  
  if (isLatest) {
    // On the latest version, show other versions available
    const otherVersions = sortedVersions.filter(v => v !== specInfo.version);
    nav = ':::tip Version Information\n';
    nav += `**Current:** v${specInfo.version} (latest)\n\n`;
    nav += '**Other versions:** ';
    nav += otherVersions.map(v => `[v${v}](/${specInfo.specName}/${v})`).join(', ');
    nav += '\n:::\n\n';
  } else {
    // On older versions, show link to latest
    nav = ':::warning Older Version\n';
    nav += `This is an older version. View the [latest version (${sortedVersions[0]})](/${specInfo.specName}/${sortedVersions[0]})`;
    nav += '\n:::\n\n';
  }
  
  return nav;
}

function generateTypeHierarchySection(spec, specInfo, context = {}) {
  let section = '## Type Information\n\n';
  
  // Special case for the meta-type
  if (specInfo.specName === 'type') {
    section += ':::info Meta-Type\n';
    section += 'This is the foundational meta-type from which all other Canon Protocol types derive. ';
    section += 'It defines the structure and validation rules for creating new types.\n';
    section += ':::\n\n';
  } else if (spec.type) {
    section += '### Type Hierarchy\n\n';
    
    // Build the hierarchy chain
    const hierarchy = [];
    let currentType = spec.type;
    
    // Parse the type chain (limited depth to prevent infinite loops)
    let depth = 0;
    const visitedTypes = new Set();
    const typeChain = [];
    
    while (currentType && depth < 5) {
      // Check if this is the meta-type referencing itself
      if (currentType.includes('canon-protocol.org/type@')) {
        typeChain.push(formatTypeReference(currentType, true));
        // Stop here - the meta-type is the root of the hierarchy
        break;
      }
      
      // Check for cycles
      if (visitedTypes.has(currentType)) {
        typeChain.push(`${formatTypeReference(currentType)} (circular reference)`);
        break;
      }
      visitedTypes.add(currentType);
      
      typeChain.push(formatTypeReference(currentType, true));
      
      // Try to find the parent type in our context
      const typeMatch = currentType.match(/([^/]+)\/([^@]+)@(.+)/);
      if (typeMatch && context.typeHierarchy) {
        const [, , typeName, ] = typeMatch;
        // Look for the parent type's parent
        const parentKey = Object.keys(context.typeHierarchy).find(key => key.startsWith(`${typeName}@`));
        if (parentKey) {
          const parentType = context.typeHierarchy[parentKey];
          if (parentType && parentType !== currentType) {
            currentType = parentType;
          } else {
            break;
          }
        } else {
          break;
        }
      } else {
        break;
      }
      depth++;
    }
    
    // Display the hierarchy using a code block for proper formatting
    section += '```\n';
    section += `${specInfo.specName}@${specInfo.version} (this specification)\n`;
    
    // Add the parent types with tree characters
    for (let i = 0; i < typeChain.length; i++) {
      const isLast = i === typeChain.length - 1;
      const prefix = isLast ? '└─ ' : '├─ ';
      // Extract just the type URI without markdown
      const typeUri = typeChain[i].match(/`([^`]+)`/)?.[1] || typeChain[i];
      section += `${prefix}${typeUri}\n`;
    }
    section += '```\n\n';
  }
  
  // Show what this type includes/composes
  if (spec.includes && spec.includes.length > 0) {
    section += '### Composes\n\n';
    section += 'This type composes the following types:\n\n';
    for (const included of spec.includes) {
      section += `- ${formatTypeReference(included, true)}\n`;
    }
    section += '\n';
  }
  
  return section;
}

function generateMetadataSection(metadata) {
  if (!metadata) return '';
  
  let section = '## Metadata\n\n';
  
  const fields = [
    { key: 'id', label: 'Identifier' },
    { key: 'publisher', label: 'Publisher' },
    { key: 'title', label: 'Title' },
    { key: 'description', label: 'Description' },
    { key: 'version', label: 'Version' },
    { key: 'license', label: 'License' },
    { key: 'homepage', label: 'Homepage' },
    { key: 'repository', label: 'Repository' }
  ];
  
  const hasContent = fields.some(f => metadata[f.key]);
  if (!hasContent) return '';
  
  section += '| Field | Value |\n';
  section += '|-------|-------|\n';
  
  for (const field of fields) {
    if (metadata[field.key]) {
      let value = metadata[field.key];
      
      // Format URLs as links
      if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
        value = `[${value}](${value})`;
      }
      
      // Format arrays
      if (Array.isArray(value)) {
        value = value.join(', ');
      }
      
      section += `| **${field.label}** | ${value} |\n`;
    }
  }
  
  return section;
}

function generateSchemaSection(schema) {
  if (!schema) return '';
  
  let section = '## Schema\n\n';
  
  if (schema.type === 'object' && schema.properties) {
    section += generatePropertiesTable(schema.properties, schema.required || []);
  } else {
    section += generateSchemaDescription(schema);
  }
  
  // Add definitions if present
  if (schema.definitions) {
    section += '\n### Definitions\n\n';
    for (const [name, definition] of Object.entries(schema.definitions)) {
      section += `#### ${name}\n\n`;
      section += generateSchemaDescription(definition);
      if (definition.properties) {
        section += generatePropertiesTable(definition.properties, definition.required || []);
      }
      section += '\n';
    }
  }
  
  return section;
}

function generatePropertiesTable(properties, required = []) {
  let table = '| Property | Type | Required | Description |\n';
  table += '|----------|------|----------|-------------|\n';
  
  for (const [propName, propSchema] of Object.entries(properties)) {
    const isRequired = required.includes(propName) ? '✅' : '❌';
    const type = formatType(propSchema);
    const description = propSchema.description || '';
    
    table += `| \`${propName}\` | ${type} | ${isRequired} | ${description} |\n`;
  }
  
  return table + '\n';
}

function formatType(schema) {
  if (schema.type) {
    let type = schema.type;
    
    if (schema.type === 'array' && schema.items) {
      type = `array<${formatType(schema.items)}>`;
    }
    
    if (schema.enum) {
      type += ` (${schema.enum.map(e => `\`${e}\``).join(' \\| ')})`;
    }
    
    if (schema.format) {
      type += ` (${schema.format})`;
    }
    
    if (schema.pattern) {
      type += ` (pattern: \`${schema.pattern}\`)`;
    }
    
    return type;
  }
  
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    return `[${refName}](#${refName.toLowerCase()})`;
  }
  
  if (schema.oneOf) {
    return schema.oneOf.map(s => formatType(s)).join(' \\| ');
  }
  
  if (schema.anyOf) {
    return schema.anyOf.map(s => formatType(s)).join(' \\| ');
  }
  
  return 'any';
}

function generateSchemaDescription(schema) {
  let description = '';
  
  if (schema.description) {
    description += schema.description + '\n\n';
  }
  
  if (schema.type && schema.type !== 'object') {
    description += `**Type:** ${formatType(schema)}\n\n`;
  }
  
  if (schema.default !== undefined) {
    description += `**Default:** \`${JSON.stringify(schema.default)}\`\n\n`;
  }
  
  if (schema.examples && schema.examples.length > 0) {
    description += '**Examples:**\n\n';
    for (const example of schema.examples) {
      description += '```yaml\n';
      description += typeof example === 'object' ? 
        require('js-yaml').dump(example) : 
        String(example);
      description += '```\n\n';
    }
  }
  
  if (schema.minimum !== undefined || schema.maximum !== undefined) {
    const constraints = [];
    if (schema.minimum !== undefined) constraints.push(`min: ${schema.minimum}`);
    if (schema.maximum !== undefined) constraints.push(`max: ${schema.maximum}`);
    description += `**Constraints:** ${constraints.join(', ')}\n\n`;
  }
  
  if (schema.minLength !== undefined || schema.maxLength !== undefined) {
    const constraints = [];
    if (schema.minLength !== undefined) constraints.push(`min length: ${schema.minLength}`);
    if (schema.maxLength !== undefined) constraints.push(`max length: ${schema.maxLength}`);
    description += `**Length:** ${constraints.join(', ')}\n\n`;
  }
  
  if (schema.minItems !== undefined || schema.maxItems !== undefined) {
    const constraints = [];
    if (schema.minItems !== undefined) constraints.push(`min items: ${schema.minItems}`);
    if (schema.maxItems !== undefined) constraints.push(`max items: ${schema.maxItems}`);
    description += `**Items:** ${constraints.join(', ')}\n\n`;
  }
  
  return description;
}

function generateSourceFilesSection(sourceFiles, specInfo) {
  if (!sourceFiles || Object.keys(sourceFiles).length === 0) {
    return '';
  }
  
  let section = '## Source Files\n\n';
  
  // Sort files with canon.yml first, then alphabetically
  const fileNames = Object.keys(sourceFiles).sort((a, b) => {
    if (a === 'canon.yml') return -1;
    if (b === 'canon.yml') return 1;
    return a.localeCompare(b);
  });
  
  // Build the base URL for source files
  const sourceBaseUrl = `https://github.com/canon-protocol/canon/tree/main/${specInfo.publisher}/${specInfo.specName}/${specInfo.version}`;
  const rawBaseUrl = `https://raw.githubusercontent.com/canon-protocol/canon/main/${specInfo.publisher}/${specInfo.specName}/${specInfo.version}`;
  
  section += ':::info\n';
  section += 'These are the source files from the Canon Protocol registry for this specification.\n';
  section += ':::\n\n';
  
  // Import tabs components at the top of the section
  section += 'import Tabs from \'@theme/Tabs\';\n';
  section += 'import TabItem from \'@theme/TabItem\';\n\n';
  
  // Start tabs container
  section += '<Tabs>\n';
  
  for (const fileName of fileNames) {
    let content = sourceFiles[fileName];
    if (!content) continue;
    
    // Determine the language for syntax highlighting
    let language = 'yaml';
    if (fileName.endsWith('.json')) language = 'json';
    else if (fileName.endsWith('.md')) language = 'markdown';
    else if (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) language = 'yaml';
    else if (fileName.endsWith('.js')) language = 'javascript';
    else if (fileName.endsWith('.ts')) language = 'typescript';
    
    // Ensure content is properly formatted
    content = content.trim();
    const lines = content.split('\n').length;
    
    // Create a safe value for the tab (remove special characters)
    const tabValue = fileName.replace(/[^a-zA-Z0-9-]/g, '-');
    
    // Start tab item
    section += `  <TabItem value="${tabValue}" label="${fileName}">\n\n`;
    
    // Add links to view the file
    section += `[View on GitHub](${sourceBaseUrl}/${fileName}) | `;
    section += `[View Raw](${rawBaseUrl}/${fileName})\n\n`;
    
    // For very large files (>200 lines), show a truncated view
    if (lines > 200) {
      section += `:::note\n`;
      section += `This file contains ${lines} lines. Showing first 50 lines as preview.\n`;
      section += `:::\n\n`;
      
      // Show first 50 lines as preview
      const preview = content.split('\n').slice(0, 50).join('\n');
      const hasTripleBackticks = preview.includes('```');
      const fence = hasTripleBackticks ? '````' : '```';
      
      section += `${fence}${language}\n`;
      section += preview;
      section += `\n...\n`;
      section += `${fence}\n\n`;
    } else {
      // For smaller files, show the full content
      const hasTripleBackticks = content.includes('```');
      const fence = hasTripleBackticks ? '````' : '```';
      
      section += `${fence}${language}\n`;
      section += content;
      section += `\n${fence}\n\n`;
    }
    
    // End tab item
    section += '  </TabItem>\n';
  }
  
  // End tabs container
  section += '</Tabs>\n\n';
  
  return section;
}

function generateExamplesSection(spec) {
  // Check if this spec derives from 'canon-protocol.org/type' (is itself a type definition)
  // Only specs that have type: canon-protocol.org/type@... are extensible types
  const isTypeDefinition = spec.type && spec.type.includes('canon-protocol.org/type@');
  
  // Only show examples section if this is a type definition (but not the meta-type itself)
  if (!isTypeDefinition || !spec._info || spec._info.specName === 'type') {
    return '';
  }
  
  let section = '## Example Usage\n\n';
  
  section += 'This specification defines a type that can be used as a base for other specifications:\n\n';
  section += '```yaml\n';
  section += `canon: "1.0"\n`;
  section += `type: ${spec._info.publisher}/${spec._info.specName}@${spec._info.version}\n`;
  section += 'metadata:\n';
  section += '  id: my-specification\n';
  section += '  version: 1.0.0\n';
  section += '  publisher: example.com\n';
  section += '  title: My Custom Specification\n';
  section += '\n# Define your specification here\n';
  section += '```\n\n';
  
  return section;
}


module.exports = {
  generateMarkdown
};