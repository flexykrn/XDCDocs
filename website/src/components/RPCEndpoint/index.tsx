import React, { useState } from 'react';
import styles from './styles.module.css';

interface Props {
  url: string;
  chainId: number;
  name: string;
}

export default function RPCEndpoint({ url, chainId, name }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.endpoint}>
      <div className={styles.header}>
        <span className={styles.name}>{name}</span>
        <span className={styles.chainId}>Chain ID: {chainId}</span>
      </div>
      <div className={styles.urlRow}>
        <code className={styles.url}>{url}</code>
        <button 
          className={`${styles.copyButton} ${copied ? styles.copied : ''}`}
          onClick={handleCopy}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
