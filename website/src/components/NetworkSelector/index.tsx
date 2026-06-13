import React, { useState } from 'react';
import styles from './styles.module.css';

export default function NetworkSelector() {
  const [network, setNetwork] = useState('mainnet');
  const networks = [
    { id: 'mainnet', name: 'XDC Mainnet', chainId: 50, color: '#10b981' },
    { id: 'apothem', name: 'Apothem Testnet', chainId: 51, color: '#f59e0b' },
    { id: 'devnet', name: 'Devnet', chainId: 551, color: '#6366f1' },
  ];

  return (
    <div className={styles.networkSelector}>
      <div className={styles.cardInner}>
        {networks.map((net) => (
          <button
            key={net.id}
            className={`${styles.networkButton} ${network === net.id ? styles.active : ''}`}
            onClick={() => setNetwork(net.id)}
            style={{ '--net-color': net.color } as React.CSSProperties}
          >
            <span className={styles.indicator} style={{ background: net.color }} />
            <span className={styles.name}>{net.name}</span>
            <span className={styles.chainId}>Chain ID: {net.chainId}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
