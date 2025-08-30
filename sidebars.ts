import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  // Main specification sidebar - dynamically generated with categories
  specSidebar: [
    {
        type: 'doc',
        id: 'index',
        label: 'Overview'
    },
    {
        type: 'category',
        label: 'Core',
        collapsible: true,
        collapsed: false,
        items: [
            {
                type: 'doc',
                id: 'canon-protocol/0.1.0',
                label: 'Canon Protocol'
            },
            {
                type: 'doc',
                id: 'type/0.2.0',
                label: 'Type Definition'
            }
        ]
    },
    {
        type: 'category',
        label: 'Guides',
        collapsible: true,
        collapsed: false,
        items: [
            {
                type: 'doc',
                id: 'version-operators-explained/0.1.0',
                label: 'Version Operators Explained'
            },
            {
                type: 'doc',
                id: 'composition-conflicts-explained/0.1.0',
                label: 'Type Composition and Field Conflicts'
            },
            {
                type: 'doc',
                id: 'type-vs-includes-explained/0.1.0',
                label: 'Type vs Includes: A Deep Dive'
            }
        ]
    },
    {
        type: 'category',
        label: 'Traits',
        collapsible: true,
        collapsed: false,
        items: [
            {
                type: 'doc',
                id: 'artifact-manifest/0.1.0',
                label: 'Artifact Manifest'
            },
            {
                type: 'doc',
                id: 'page-config/0.1.0',
                label: 'Page Configuration'
            }
        ]
    },
    {
        type: 'category',
        label: 'Types',
        collapsible: true,
        collapsed: false,
        items: [
            {
                type: 'doc',
                id: 'protocol/0.1.0',
                label: 'Protocol Specification'
            },
            {
                type: 'doc',
                id: 'registry/0.1.0',
                label: 'Canon Registry'
            },
            {
                type: 'doc',
                id: 'project/0.1.0',
                label: 'Canon Project Configuration'
            },
            {
                type: 'doc',
                id: 'blog-post/0.1.0',
                label: 'Blog Post'
            }
        ]
    },
    {
        type: 'category',
        label: 'Other',
        collapsible: true,
        collapsed: false,
        items: [
            {
                type: 'doc',
                id: 'canon-protocol-registry/0.1.0',
                label: 'Canon Protocol Registry'
            }
        ]
    }
],
};

export default sidebars;
