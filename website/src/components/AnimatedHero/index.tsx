import React from 'react';
import styles from './styles.module.css';

export default function AnimatedHero() {
  return (
    <div className={styles.hero}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          <span className={styles.gradient}>XDC Network</span>
          <br />
          Documentation
        </h1>
        <p className={styles.subtitle}>
          Build the future of decentralized finance on the XDC Chain
        </p>
        <div className={styles.cta}>
          <a href="/learn" className={styles.primaryButton}>
            Get Started
          </a>
          <a href="/xdcchain/developers" className={styles.secondaryButton}>
            Developer Docs
          </a>
        </div>
      </div>
      <div className={styles.grid} />
    </div>
  );
}
