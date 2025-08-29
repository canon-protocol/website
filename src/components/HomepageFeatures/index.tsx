import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Universal Type System',
    icon: '🔧',
    description: (
      <>
        Define and share specifications using a powerful meta-type system. 
        Every type derives from a foundational schema, ensuring consistency 
        and interoperability across all implementations.
      </>
    ),
  },
  {
    title: 'Decentralized by Design',
    icon: '🌐',
    description: (
      <>
        No central authority or single point of failure. Publishers maintain 
        full control over their specifications while benefiting from a 
        global discovery network.
      </>
    ),
  },
  {
    title: 'Cryptographic Trust',
    icon: '🔐',
    description: (
      <>
        Every specification is signed and verified using Ed25519 signatures. 
        Ensure authenticity and detect tampering with built-in cryptographic 
        verification at every layer.
      </>
    ),
  },
  {
    title: 'Semantic Versioning',
    icon: '📦',
    description: (
      <>
        Full semantic versioning with compatibility tracking. Use flexible 
        version constraints to ensure your dependencies evolve safely 
        without breaking changes.
      </>
    ),
  },
  {
    title: 'Registry Federation',
    icon: '🔄',
    description: (
      <>
        Multiple registries can federate and share specifications. Build 
        private registries for internal use or contribute to the public 
        ecosystem.
      </>
    ),
  },
  {
    title: 'Language Agnostic',
    icon: '💻',
    description: (
      <>
        Works with any programming language or specification format. Canon 
        Protocol provides the universal layer for specification discovery 
        and distribution.
      </>
    ),
  },
];

function Feature({title, icon, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <div className={styles.featureIcon}>{icon}</div>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="text--center margin-bottom--lg">
          <Heading as="h2">Why Canon Protocol?</Heading>
          <p className={styles.featuresSubtitle}>
            Canon Protocol reimagines how specifications are created, shared, and evolved
          </p>
        </div>
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}