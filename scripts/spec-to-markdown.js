function generateMarkdown(spec, specInfo) {
  const { metadata, schema } = spec;
  
  // Generate frontmatter
  const frontmatter = `---
id: ${specInfo.version}
title: ${metadata?.title || specInfo.specName} v${specInfo.version}
sidebar_label: v${specInfo.version}
---`;

  // Generate header
  const header = `
# ${metadata?.title || specInfo.specName}

**Version:** ${specInfo.version}  
**Publisher:** ${specInfo.publisher}  
**Type:** ${spec.type || 'N/A'}

${metadata?.description || ''}
`;

  // Generate metadata section
  const metadataSection = generateMetadataSection(metadata);
  
  // Generate schema section
  const schemaSection = generateSchemaSection(schema);
  
  // Generate examples section
  const examplesSection = generateExamplesSection(spec);
  
  // Combine all sections
  return `${frontmatter}

${header}

${metadataSection}

${schemaSection}

${examplesSection}
`;
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
  let section = '## Example\n\n';
  
  // Generate a complete example based on the schema
  const example = generateExampleFromSchema(spec.schema);
  
  section += '```yaml\n';
  section += `canon: "${spec.canon || '1.0'}"\n`;
  if (spec.type) {
    section += `type: ${spec.type}\n`;
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