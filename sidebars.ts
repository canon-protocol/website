import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  // Main specification sidebar - dynamically generated based on page_order
  specSidebar: [
    {
        type: 'doc',
        id: 'index',
        label: 'Overview'
    },
    {
        type: 'doc',
        id: 'canon-protocol/0.1.0',
        label: 'Canon Protocol'
    },
    {
        type: 'doc',
        id: 'type/0.1.0',
        label: 'Type Definition'
    },
    {
        type: 'doc',
        id: 'canon-protocol-registry/0.1.0',
        label: 'Canon Protocol Registry'
    },
    {
        type: 'doc',
        id: 'page-config/0.1.0',
        label: 'Page Configuration'
    },
    {
        type: 'doc',
        id: 'project/0.1.0',
        label: 'Canon Project Configuration'
    },
    {
        type: 'doc',
        id: 'protocol/0.1.0',
        label: 'Protocol Specification'
    },
    {
        type: 'doc',
        id: 'registry/0.1.0',
        label: 'Canon Registry'
    }
],
};

export default sidebars;
