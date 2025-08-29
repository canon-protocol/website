function generateMarkdown(spec, specInfo, context = {}) {
  const { metadata, schema, includes } = spec;
  const { allVersions = [], typeHierarchy = {}, sourceFiles = {} } = context;
  
  // Determine if this is the latest version
  const sortedVersions = [...allVersions].sort((a, b) => {
    // Simple version comparison - enhance if needed
    return b.localeCompare(a);
  });
  const isLatest = sortedVersions[0] === specInfo.version;
  
  // Generate frontmatter
  const frontmatter = `---
id: ${specInfo.version}
title: ${metadata?.title || specInfo.specName} v${specInfo.version}
sidebar_label: v${specInfo.version}${isLatest ? ' (latest)' : ''}
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
    // We need to go up to the specifications root and then down to the specific spec
    const link = `/docs/specifications/${typeName}/${version}`;
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
  
  let nav = '## Version Navigation\n\n';
  nav += '<div class="version-nav">\n\n';
  
  // Sort versions
  const sortedVersions = [...allVersions].sort((a, b) => b.localeCompare(a));
  
  nav += '**Available versions:** ';
  nav += sortedVersions.map(v => {
    if (v === specInfo.version) {
      return `**${v}** (current)`;
    }
    return `[${v}](../${v})`;
  }).join(' • ');
  
  nav += '\n\n</div>\n';
  
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
    
    // Add current spec to hierarchy
    hierarchy.push(`**${specInfo.specName}@${specInfo.version}** (this specification)`);
    
    // Parse the type chain (limited depth to prevent infinite loops)
    let depth = 0;
    const visitedTypes = new Set();
    
    while (currentType && depth < 5) {
      // Check if this is the meta-type referencing itself
      if (currentType.includes('canon-protocol.org/type@')) {
        hierarchy.push(`└─ ${formatTypeReference(currentType, true)}`);
        // Stop here - the meta-type is the root of the hierarchy
        break;
      }
      
      // Check for cycles
      if (visitedTypes.has(currentType)) {
        hierarchy.push(`└─ ${formatTypeReference(currentType)} (circular reference)`);
        break;
      }
      visitedTypes.add(currentType);
      
      hierarchy.push(`└─ ${formatTypeReference(currentType, true)}`);
      
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
            hierarchy[hierarchy.length - 1] = hierarchy[hierarchy.length - 1].replace('└─', '├─');
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
    
    // Display the hierarchy (not in a code block since we have links)
    section += hierarchy.join('\n') + '\n\n';
    
    section += '### Direct Parent\n\n';
    section += `This type derives from: ${formatTypeReference(spec.type, true)}\n\n`;
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
  
  // Show known derived types (if any)
  if (context.derivedTypes && context.derivedTypes[`${specInfo.publisher}/${specInfo.specName}@${specInfo.version}`]) {
    const derived = context.derivedTypes[`${specInfo.publisher}/${specInfo.specName}@${specInfo.version}`];
    if (derived.length > 0) {
      section += '### Known Derived Types\n\n';
      section += 'The following types derive from this specification:\n\n';
      for (const derivedType of derived) {
        section += `- ${formatTypeReference(derivedType, true)}\n`;
      }
      section += '\n';
    }
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
    
    // Add file header with links
    section += `### ${fileName}\n\n`;
    section += `[View on GitHub](${sourceBaseUrl}/${fileName}) | `;
    section += `[View Raw](${rawBaseUrl}/${fileName})\n\n`;
    
    // For very large files (>200 lines), just show a link
    if (lines > 200) {
      section += `:::note\n`;
      section += `This file contains ${lines} lines. View the full content using the links above.\n`;
      section += `:::\n\n`;
      
      // Show first 50 lines as preview
      const preview = content.split('\n').slice(0, 50).join('\n');
      const fence = preview.includes('```') ? '````' : '```';
      
      section += `**Preview (first 50 lines):**\n\n`;
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
  }
  
  return section;
}

function generateExamplesSection(spec) {
  let section = '## Example Usage\n\n';
  
  // Check if this spec derives from 'canon-protocol.org/type' (is itself a type definition)
  // Only specs that have type: canon-protocol.org/type@... are extensible types
  const isTypeDefinition = spec.type && spec.type.includes('canon-protocol.org/type@');
  
  // Show "Using this Type" only for specs that are type definitions
  // (but not for the meta-type itself)
  if (isTypeDefinition && spec._info) {
    section += '### Using this Type\n\n';
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
  }
  
  section += '### Complete Example\n\n';
  
  // Generate a complete example based on the schema
  const example = generateExampleFromSchema(spec.schema);
  
  section += '```yaml\n';
  section += `canon: "${spec.canon || '1.0'}"\n`;
  if (spec.type) {
    section += `type: ${spec.type}\n`;
  }
  
  if (spec.includes && spec.includes.length > 0) {
    section += 'includes:\n';
    for (const inc of spec.includes) {
      section += `  - ${inc}\n`;
    }
  }
  
  if (spec.metadata) {
    section += 'metadata:\n';
    const metaExample = generateExampleFromSchema({ 
      type: 'object', 
      properties: spec.metadata 
    });
    section += indent(require('js-yaml').dump(metaExample), 2);
  }
  
  if (example && Object.keys(example).length > 0) {
    const exampleYaml = require('js-yaml').dump(example);
    section += exampleYaml;
  }
  
  section += '```\n';
  
  return section;
}

function generateExampleFromSchema(schema, depth = 0) {
  if (!schema || depth > 3) return null;
  
  if (schema.example !== undefined) {
    return schema.example;
  }
  
  if (schema.default !== undefined) {
    return schema.default;
  }
  
  switch (schema.type) {
    case 'string':
      if (schema.enum) return schema.enum[0];
      if (schema.format === 'uri' || schema.format === 'url') return 'https://example.com';
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'date') return '2024-01-01';
      if (schema.format === 'date-time') return '2024-01-01T00:00:00Z';
      if (schema.pattern) {
        if (schema.pattern.includes('\\d')) return '1.0.0';
      }
      return 'example-string';
      
    case 'number':
    case 'integer':
      if (schema.minimum !== undefined) return schema.minimum;
      if (schema.maximum !== undefined) return schema.maximum;
      return 1;
      
    case 'boolean':
      return true;
      
    case 'array':
      if (schema.items) {
        const itemExample = generateExampleFromSchema(schema.items, depth + 1);
        return itemExample !== null ? [itemExample] : [];
      }
      return [];
      
    case 'object':
      if (schema.properties) {
        const obj = {};
        const required = schema.required || [];
        
        // Include required properties and a few optional ones
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          if (required.includes(propName) || depth < 2) {
            const value = generateExampleFromSchema(propSchema, depth + 1);
            if (value !== null) {
              obj[propName] = value;
            }
          }
        }
        
        return obj;
      }
      return {};
      
    default:
      if (schema.$ref) {
        return `# See ${schema.$ref}`;
      }
      if (schema.oneOf && schema.oneOf.length > 0) {
        return generateExampleFromSchema(schema.oneOf[0], depth + 1);
      }
      if (schema.anyOf && schema.anyOf.length > 0) {
        return generateExampleFromSchema(schema.anyOf[0], depth + 1);
      }
      return null;
  }
}

function indent(text, spaces) {
  const indentation = ' '.repeat(spaces);
  return text.split('\n').map(line => line ? indentation + line : line).join('\n');
}

module.exports = {
  generateMarkdown
};