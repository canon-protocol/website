function generateMarkdown(spec, specInfo, context = {}) {
  const { metadata, schema, includes } = spec;
  const { allVersions = [], typeHierarchy = {}, sourceFiles = {}, typeSchemas = {}, allSpecs = {} } = context;
  
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
  
  // Generate meta-type notice if applicable
  const metaTypeNotice = generateMetaTypeNotice(specInfo);
  
  // Generate schema section
  const schemaSection = generateSchemaSection(schema);
  
  // Generate examples section
  const examplesSection = generateExamplesSection(spec);
  
  // Generate spec content section (based on type schema)
  const specContentSection = generateSpecContentSection(spec, specInfo, context);
  
  // Generate source files section
  const sourceFilesSection = generateSourceFilesSection(sourceFiles, specInfo);
  
  // Combine all sections
  return `${frontmatter}

${header}

${versionNav}

${metaTypeNotice}

${schemaSection}

${specContentSection}

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

function generateMetaTypeNotice(specInfo) {
  // Special notice for the meta-type
  if (specInfo.specName === 'type') {
    let notice = ':::info Meta-Type\n';
    notice += 'This is the foundational meta-type from which all other Canon Protocol types derive. ';
    notice += 'It defines the structure and validation rules for creating new types.\n';
    notice += ':::\n\n';
    return notice;
  }
  return '';
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

function generateSpecContentSection(spec, specInfo, context) {
  const { typeSchemas = {} } = context;
  
  // Skip if this is a type definition itself (they have schema sections)
  if (spec.type && spec.type.includes('canon-protocol.org/type@')) {
    return '';
  }
  
  // Get the spec's type to look up its schema
  if (!spec.type) {
    return '';
  }
  
  // Parse the type URI to get the schema
  const typeMatch = spec.type.match(/([^@]+)@(.+)/);
  if (!typeMatch) {
    return '';
  }
  
  const [, typeBase, typeVersion] = typeMatch;
  const typeUri = `${typeBase}@${typeVersion}`;
  const typeSchema = typeSchemas[typeUri];
  
  if (!typeSchema || !typeSchema.schema) {
    return '';
  }
  
  // Get all spec fields (excluding protocol fields)
  const protocolFields = ['canon', 'type', 'metadata', 'includes', 'schema'];
  const specFields = Object.keys(spec).filter(key => !protocolFields.includes(key) && !key.startsWith('_'));
  
  if (specFields.length === 0) {
    return '';
  }
  
  // Track which fields belong to base type vs composed types
  const baseTypeFields = [];
  const composedTypeFields = {};
  
  // Separate fields by their source type
  for (const fieldName of specFields) {
    if (typeSchema.schema && typeSchema.schema[fieldName]) {
      baseTypeFields.push(fieldName);
    } else {
      // Check which composed type this field comes from
      if (spec.includes && Array.isArray(spec.includes)) {
        for (const includeUri of spec.includes) {
          const includeMatch = includeUri.match(/([^@]+)@(.+)/);
          if (includeMatch) {
            const [, includeBase, includeVersion] = includeMatch;
            const includeTypeUri = `${includeBase}@${includeVersion}`;
            const includeSchema = typeSchemas[includeTypeUri];
            if (includeSchema && includeSchema.schema && includeSchema.schema[fieldName]) {
              if (!composedTypeFields[includeUri]) {
                composedTypeFields[includeUri] = [];
              }
              composedTypeFields[includeUri].push(fieldName);
              break; // Found the source, stop looking
            }
          }
        }
      }
    }
  }
  
  let section = '## Specification Content\n\n';
  section += ':::info\n';
  section += 'This section displays the specification fields organized by their type definitions.\n';
  section += ':::\n\n';
  
  // Display base type fields first
  if (baseTypeFields.length > 0) {
    section += '### Core Properties\n\n';
    section += `*These properties are defined by the base type: \`${spec.type}\`*\n\n`;
    
    // Sort base fields by schema definition order
    const baseFieldOrder = Object.keys(typeSchema.schema);
    baseTypeFields.sort((a, b) => {
      const aIndex = baseFieldOrder.indexOf(a);
      const bIndex = baseFieldOrder.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      return a.localeCompare(b);
    });
    
    for (const fieldName of baseTypeFields) {
      const fieldValue = spec[fieldName];
      const fieldSchema = typeSchema.schema[fieldName] || {};
      section += generateFieldDisplay(fieldName, fieldValue, fieldSchema);
    }
  }
  
  // Display composed type fields
  if (Object.keys(composedTypeFields).length > 0) {
    section += '### Composed Properties\n\n';
    section += '*These properties are added through type composition:*\n\n';
    
    for (const [composedTypeUri, fields] of Object.entries(composedTypeFields)) {
      // Get the composed type schema
      const composedMatch = composedTypeUri.match(/([^@]+)@(.+)/);
      if (composedMatch) {
        const [, composedBase, composedVersion] = composedMatch;
        const composedTypeKey = `${composedBase}@${composedVersion}`;
        const composedSchema = typeSchemas[composedTypeKey];
        
        // Extract just the type name for the header
        const typeName = composedBase.split('/').pop();
        
        section += `#### From ${typeName}\n\n`;
        section += `*Properties from \`${composedTypeUri}\`:*\n\n`;
        
        // Sort composed fields by their schema definition order
        if (composedSchema && composedSchema.schema) {
          const composedFieldOrder = Object.keys(composedSchema.schema);
          fields.sort((a, b) => {
            const aIndex = composedFieldOrder.indexOf(a);
            const bIndex = composedFieldOrder.indexOf(b);
            if (aIndex !== -1 && bIndex !== -1) {
              return aIndex - bIndex;
            }
            return a.localeCompare(b);
          });
          
          for (const fieldName of fields) {
            const fieldValue = spec[fieldName];
            const fieldSchema = composedSchema.schema[fieldName] || {};
            section += generateFieldDisplay(fieldName, fieldValue, fieldSchema);
          }
        }
      }
    }
  }
  
  return section;
}

function generateFieldDisplay(fieldName, fieldValue, fieldSchema) {
  let display = '';
  
  // Get field metadata from schema
  const title = fieldSchema.title || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const description = fieldSchema.description || '';
  const fieldType = fieldSchema.type || 'any';
  const required = fieldSchema.required === true;
  
  // Start field display
  display += `### ${title}\n\n`;
  
  // Add required/optional badge
  if (required) {
    display += '![Required](https://img.shields.io/badge/required-red) ';
  } else {
    display += '![Optional](https://img.shields.io/badge/optional-blue) ';
  }
  
  // Add type badge
  display += `![Type: ${fieldType}](https://img.shields.io/badge/type-${fieldType}-purple)\n\n`;
  
  // Format the value based on type
  if (fieldValue === null || fieldValue === undefined) {
    display += '*Not specified*\n\n';
  } else if (fieldType === 'array' && Array.isArray(fieldValue)) {
    display += formatArrayValue(fieldValue, fieldSchema);
  } else if (fieldType === 'object' && typeof fieldValue === 'object') {
    display += formatObjectValue(fieldValue, fieldSchema);
  } else if (fieldType === 'string') {
    display += formatStringValue(fieldValue, fieldSchema);
  } else if (fieldType === 'number') {
    display += `\`${fieldValue}\`\n\n`;
  } else if (fieldType === 'boolean') {
    display += `\`${fieldValue}\`\n\n`;
  } else {
    // Default formatting
    display += `\`\`\`yaml\n${typeof fieldValue === 'object' ? JSON.stringify(fieldValue, null, 2) : fieldValue}\n\`\`\`\n\n`;
  }
  
  // Add description if available
  if (description) {
    display += `> ${description}\n\n`;
  }
  
  display += '---\n\n';
  
  return display;
}

function formatArrayValue(value, schema) {
  let display = '';
  const items = schema.items || {};
  
  if (value.length === 0) {
    display += '*Empty list*\n\n';
    return display;
  }
  
  // Format based on item type
  if (items.type === 'object' && items.properties) {
    // Array of objects - format as table
    display += '| ';
    const props = Object.keys(items.properties);
    display += props.map(p => items.properties[p].title || p).join(' | ');
    display += ' |\n';
    display += '|' + props.map(() => '---').join('|') + '|\n';
    
    for (const item of value) {
      display += '| ';
      display += props.map(p => {
        const val = item[p];
        if (val && typeof val === 'string' && val.startsWith('http')) {
          return `[${val.replace(/https?:\/\//, '')}](${val})`;
        }
        return val || '-';
      }).join(' | ');
      display += ' |\n';
    }
    display += '\n';
  } else {
    // Simple array - format as list
    for (const item of value) {
      if (typeof item === 'string') {
        // Check if it's a URI/reference
        if (item.includes('@') && item.includes('/')) {
          const parts = item.split('@');
          display += `- \`${item}\`\n`;
        } else {
          display += `- ${item}\n`;
        }
      } else {
        display += `- ${JSON.stringify(item)}\n`;
      }
    }
    display += '\n';
  }
  
  return display;
}

function formatObjectValue(value, schema) {
  let display = '';
  const properties = schema.properties || {};
  
  // Format as a definition list
  for (const [key, val] of Object.entries(value)) {
    const propSchema = properties[key] || {};
    const propTitle = propSchema.title || key;
    
    display += `**${propTitle}**: `;
    
    if (typeof val === 'string') {
      // Check if it's a URL
      if (val.startsWith('http')) {
        display += `[${val}](${val})`;
      } 
      // Check if it contains template variables that need escaping
      else if (val.includes('{') || val.includes('}')) {
        display += `\`${val}\``;
      } 
      // Default string
      else {
        display += `${val}`;
      }
    } else if (typeof val === 'object') {
      display += `\n\`\`\`yaml\n${JSON.stringify(val, null, 2)}\n\`\`\``;
    } else {
      display += `${val}`;
    }
    display += '\n\n';
  }
  
  return display;
}

function formatStringValue(value, schema) {
  // Check if it's a URL
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return `[${value}](${value})\n\n`;
  }
  
  // Check if it's a file path or contains template variables
  if (value.endsWith('.md') || value.endsWith('.yml') || value.endsWith('.yaml') || 
      value.includes('{') || value.includes('}')) {
    return `\`${value}\`\n\n`;
  }
  
  // Check if it's a multiline string
  if (value.includes('\n')) {
    return `\`\`\`\n${value}\n\`\`\`\n\n`;
  }
  
  // Default string formatting
  return `${value}\n\n`;
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