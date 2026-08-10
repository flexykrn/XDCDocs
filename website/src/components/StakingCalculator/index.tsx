import {useMemo, useState} from 'react';
import styles from './styles.module.css';

type Role = 'masternode' | 'standby';

const STAKE_XDC = 10_000_000;
const APR: Record<Role, number> = {masternode: 0.1, standby: 0.08};
const EPOCH_REWARD_TOTAL = 5_000;
const FOUNDATION_SHARE = 0.1;
const EPOCHS_PER_DAY = 48;
const DAYS_PER_YEAR = 365;
const MAX_NODES = 108;

const xdc = (n: number) =>
  n.toLocaleString('en-US', {maximumFractionDigits: 2});

const usd = (n: number) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });

export default function StakingCalculator() {
  const [role, setRole] = useState<Role>('masternode');
  const [price, setPrice] = useState('0.05');
  const [nodes, setNodes] = useState(MAX_NODES);

  const priceNum = useMemo(() => {
    const p = parseFloat(price);
    return Number.isFinite(p) && p > 0 ? p : 0;
  }, [price]);

  const results = useMemo(() => {
    const annualPerNode = STAKE_XDC * APR[role];
    const monthlyPerNode = annualPerNode / 12;
    const perNodeEpochPool =
      (EPOCH_REWARD_TOTAL * (1 - FOUNDATION_SHARE)) / nodes;
    const epochAnnual =
      role === 'masternode'
        ? perNodeEpochPool * EPOCHS_PER_DAY * DAYS_PER_YEAR
        : null;
    return {annualPerNode, monthlyPerNode, epochAnnual};
  }, [role, nodes]);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Staking Rewards Calculator</span>
        <span className={styles.badge}>Estimates</span>
      </div>

      <div className={styles.field}>
        <span className={styles.label} id="sc-role-label">
          Node role
        </span>
        <div
          className={styles.buttons}
          role="group"
          aria-labelledby="sc-role-label">
          <button
            type="button"
            className={`${styles.btn} ${role === 'masternode' ? styles.active : ''}`}
            aria-pressed={role === 'masternode'}
            onClick={() => setRole('masternode')}>
            Masternode operator
          </button>
          <button
            type="button"
            className={`${styles.btn} ${role === 'standby' ? styles.active : ''}`}
            aria-pressed={role === 'standby'}
            onClick={() => setRole('standby')}>
            Standby node
          </button>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="sc-price">
          XDC price (USD)
        </label>
        <input
          id="sc-price"
          className={styles.input}
          type="number"
          min="0"
          step="0.001"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="sc-nodes">
          Masternodes on network: <strong>{nodes}</strong>
        </label>
        <input
          id="sc-nodes"
          className={styles.slider}
          type="range"
          min="1"
          max={MAX_NODES}
          step="1"
          value={nodes}
          onChange={(e) => setNodes(Number(e.target.value))}
        />
      </div>

      <div className={styles.results} aria-live="polite">
        <div className={styles.resultRow}>
          <span className={styles.resultLabel}>Estimated annual reward</span>
          <span className={styles.resultValue}>
            {xdc(results.annualPerNode)} XDC
          </span>
        </div>
        <div className={styles.resultRow}>
          <span className={styles.resultLabel}>Estimated monthly reward</span>
          <span className={styles.resultValue}>
            {xdc(results.monthlyPerNode)} XDC
          </span>
        </div>
        <div className={styles.resultRow}>
          <span className={styles.resultLabel}>Annual value (USD)</span>
          <span className={styles.resultValueAccent}>
            {usd(results.annualPerNode * priceNum)}
          </span>
        </div>
        <div className={styles.resultRow}>
          <span className={styles.resultLabel}>Monthly value (USD)</span>
          <span className={styles.resultValueAccent}>
            {usd(results.monthlyPerNode * priceNum)}
          </span>
        </div>
        {results.epochAnnual !== null && (
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>
              Epoch-model annual (at {nodes} nodes)
            </span>
            <span className={styles.resultValue}>
              ~{xdc(results.epochAnnual)} XDC
            </span>
          </div>
        )}
      </div>

      <p className={styles.note}>
        Estimates per the documented rewards model: {xdc(STAKE_XDC)} XDC staked
        per node, fixed APR of {role === 'masternode' ? '10%' : '8%'} (
        {role === 'masternode' ? '1,000,000' : '800,000'} XDC/year ÷ 12
        monthly). Epoch model: 5,000 XDC per epoch, 10% foundation share, 4,500
        XDC split among {nodes} nodes, 48 epochs/day. Actual rewards vary with
        participation rate, network conditions, and validator set size.
      </p>
    </div>
  );
}
