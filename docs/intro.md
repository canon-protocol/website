---
id: intro
title: Introduction
sidebar_position: 1
---

# Canon Protocol Documentation

Welcome to the Canon Protocol documentation. Canon is a universal specification registry protocol that enables decentralized, interoperable management and distribution of specifications.

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

```bash
cargo install canon-cli
```

This will download, compile, and install the `canon` command to your system.

### Basic Usage

Initialize a new Canon project:

```bash
canon init my-project
```

Add a specification:

```bash
canon add registry@1.0.0
```

Publish your specifications:

```bash
canon publish
```

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Publisher  │────▶│   Registry   │◀────│  Consumer   │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │                     │
       ▼                    ▼                     ▼
  [Signs Specs]      [Stores Specs]       [Fetches Specs]
```

## Why Canon Protocol?

### Universal Compatibility
Works with any specification format, programming language, or ecosystem.

### Decentralized by Design
No single point of control or failure. Publishers maintain sovereignty over their specifications.

### Cryptographically Secure
All specifications are signed and verified, ensuring authenticity and integrity.

### Version-Aware
Full semantic versioning support with compatibility tracking and dependency resolution.

## Next Steps

- [Specifications Reference](specifications/) - Explore available specifications
- [Canon CLI](https://github.com/canon-protocol/canon-cli) - Command-line tools
- [Canon Registry](https://github.com/canon-protocol/canon) - Official specification registry