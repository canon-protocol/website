---
id: index
title: Canon Protocol Specifications
sidebar_label: Overview
sidebar_position: 1
---

# Canon Protocol Specifications

The Canon Protocol specifications define the core components and schemas that make up the protocol. These specifications are automatically generated from the official Canon Protocol registry.

## Available Specifications

Specifications will be automatically populated here when you run the GitHub Action to update specs. To update the specifications:

1. Go to the [Actions tab](https://github.com/canon-protocol/website/actions) in your repository
2. Select "Update Canon Specifications" workflow
3. Click "Run workflow"
4. The specifications will be fetched and converted to documentation

## Specification Categories

### Registry Specifications
Define how Canon registries operate, including API endpoints, authentication, and package management.

### Project Specifications
Define the structure of Canon projects, including dependencies, build processes, and metadata.

### Type Specifications
Define the type system and schema validation used throughout Canon Protocol.

### Protocol Registry Specifications
Define the core protocol registry that hosts the canonical specifications.

## Understanding Specifications

Each specification includes:

- **Metadata**: Basic information about the spec including version, publisher, and description
- **Schema**: The JSON Schema that defines the structure and validation rules
- **Examples**: Sample implementations showing how to use the specification
- **Version History**: Links to previous versions of the specification

## Using Specifications

To use a Canon specification in your project:

```bash
# Add a specific specification
canon add registry@1.0.0

# List available specifications
canon list

# Show details about a specification
canon show registry@1.0.0
```

## Contributing

Canon Protocol specifications are managed in the [canon-protocol/canon](https://github.com/canon-protocol/canon) repository. To propose changes or additions:

1. Fork the repository
2. Create your specification following the Canon format
3. Submit a pull request with your changes
4. The specification will be reviewed and potentially included in the next release