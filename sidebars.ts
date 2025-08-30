import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  // Main specification sidebar - NO CATEGORIES, ONLY LATEST VERSIONS
  specSidebar: [
    {
      type: 'doc',
      id: 'getting-started',
      label: 'Getting Started',
    },
    {
      type: 'doc', 
      id: 'index',
      label: 'Specifications Overview',
    },
    {
      type: 'doc',
      id: 'type/0.1.0',
      label: 'Type Definition',
    },
    {
      type: 'doc',
      id: 'canon-protocol/0.1.0',
      label: 'Canon Protocol',
    },
    {
      type: 'doc',
      id: 'canon-protocol-registry/0.1.0',
      label: 'Canon Protocol Registry',
    },
    {
      type: 'doc',
      id: 'registry/0.1.0',
      label: 'Canon Registry',
    },
    {
      type: 'doc',
      id: 'project/0.1.0',
      label: 'Canon Project',
    },
    {
      type: 'doc',
      id: 'protocol/0.1.0',
      label: 'Canon Protocol Spec',
    },
  ],
};

export default sidebars;
