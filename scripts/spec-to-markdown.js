function generateMarkdown(spec, specInfo, context = {}) {
  const { metadata, schema, includes } = spec;
  const { allVersions = [], typeHierarchy = {} } = context;
  
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
---`;

  // Generate header with enhanced type information
  const header = `
# ${metadata?.title || specInfo.specName}

${generateVersionBadge(specInfo.version, isLatest)}

**Publisher:** ${specInfo.publisher}  
**Type:** ${formatTypeReference(spec.type)}  
${includes ? `**Composes:** ${formatIncludes(includes)}  ` : ''}

${metadata?.description || ''}
`;

  // Generate version navigation
  const versionNav = generateVersionNavigation(specInfo, allVersions);
  
  // Generate type hierarchy section
  const typeHierarchySection = generateTypeHierarchySection(spec, specInfo);
  
  // Generate metadata section
  const metadataSection = generateMetadataSection(metadata);
  
  // Generate schema section
  const schemaSection = generateSchemaSection(schema);
  
  // Generate examples section
  const examplesSection = generateExamplesSection(spec);
  
  // Combine all sections
  return `${frontmatter}

${header}

${versionNav}

${typeHierarchySection}

${metadataSection}

${schemaSection}

${examplesSection}
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

function formatTypeReference(type) {
  if (!type) return 'N/A';
  
  // Check if it's a special type
  if (type === 'canon-protocol.org/type@0.1.0') {
    return '`canon-protocol.org/type@0.1.0` (meta-type)';
  }
  
  // Format as inline code
  return `\`${type}\``;
}

function formatIncludes(includes) {
  if (!includes || includes.length === 0) return '';
  
  const formatted = includes.map(inc => `\`${inc}\``).join(', ');
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

function generateTypeHierarchySection(spec, specInfo) {
  let section = '## Type Information\n\n';
  
  // Special case for the meta-type
  if (specInfo.specName === 'type') {
    section += ':::info Meta-Type\n';
    section += 'This is the foundational meta-type from which all other Canon Protocol types derive. ';
    section += 'It defines the structure and validation rules for creating new types.\n';
    section += ':::\n\n';
  } else if (spec.type) {
    section += '### Derives From\n\n';
    section += `This type derives from: ${formatTypeReference(spec.type)}\n\n`;
  }
  
  // Show what this type includes/composes
  if (spec.includes && spec.includes.length > 0) {
    section += '### Composes\n\n';
    section += 'This type composes the following types:\n\n';
    for (const included of spec.includes) {
      section += `- ${formatTypeReference(included)}\n`;
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