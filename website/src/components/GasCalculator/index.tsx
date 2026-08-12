import {useState} from 'react';
import styles from './styles.module.css';

const XDC_GAS_PRICE_GWEI = 0.25;

const OPERATIONS = [
  {id: 'transfer', label: 'XDC Transfer (21,000 gas)', gas: 21000},
  {id: 'xrc20', label: 'XRC20 Transfer (~65,000 gas)', gas: 65000},
  {id: 'deploy', label: 'Contract Deploy (~1,200,000 gas)', gas: 1200000},
  {id: 'custom', label: 'Custom gas amount', gas: 0},
] as const;

type OperationId = (typeof OPERATIONS)[number]['id'];

const GWEI = 1e-9;

function formatUsd(value: number): string {
  if (value === 0) return '$0';
  if (value < 0.01) return `$${value.toFixed(6)}`;
  if (value < 1) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

export default function GasCalculator() {
  const [operation, setOperation] = useState<OperationId>('transfer');
  const [customGas, setCustomGas] = useState(21000);
  const [ethGasPrice, setEthGasPrice] = useState(20);
  const [xdcPrice, setXdcPrice] = useState(0.05);
  const [ethPrice, setEthPrice] = useState(3500);

  const selected = OPERATIONS.find((op) => op.id === operation) ?? OPERATIONS[0];
  const gasUsed = operation === 'custom' ? Math.max(0, customGas) : selected.gas;

  const xdcCost = gasUsed * XDC_GAS_PRICE_GWEI * GWEI;
  const xdcUsd = xdcCost * xdcPrice;
  const ethCost = gasUsed * Math.max(0, ethGasPrice) * GWEI;
  const ethUsd = ethCost * Math.max(0, ethPrice); // use ETH price, not XDC price
  const multiplier = xdcCost > 0 ? ethCost / xdcCost : 0;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Gas Fee Calculator</span>
        <span className={styles.badge}>XDC @ {XDC_GAS_PRICE_GWEI} Gwei</span>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="gc-operation">
          Operation
        </label>
        <select
          id="gc-operation"
          className={styles.input}
          value={operation}
          onChange={(e) => setOperation(e.target.value as OperationId)}>
          {OPERATIONS.map((op) => (
            <option key={op.id} value={op.id}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      {operation === 'custom' && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="gc-custom-gas">
            Gas amount: {gasUsed.toLocaleString()}
          </label>
          <input
            id="gc-custom-gas"
            className={styles.range}
            type="range"
            min={21000}
            max={3000000}
            step={1000}
            value={customGas}
            onChange={(e) => setCustomGas(Number(e.target.value))}
          />
          <input
            className={styles.input}
            type="number"
            min={0}
            aria-label="Custom gas amount (exact value)"
            value={customGas}
            onChange={(e) => setCustomGas(Number(e.target.value))}
          />
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="gc-eth-price">
            ETH gas price (Gwei)
          </label>
          <input
            id="gc-eth-price"
            className={styles.input}
            type="number"
            min={0}
            step={1}
            value={ethGasPrice}
            onChange={(e) => setEthGasPrice(Number(e.target.value))}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="gc-xdc-price">
            XDC price (USD)
          </label>
          <input
            id="gc-xdc-price"
            className={styles.input}
            type="number"
            min={0}
            step={0.01}
            value={xdcPrice}
            onChange={(e) => setXdcPrice(Number(e.target.value))}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="gc-eth-usd-price">
            ETH price (USD)
          </label>
          <input
            id="gc-eth-usd-price"
            className={styles.input}
            type="number"
            min={0}
            step={10}
            value={ethPrice}
            onChange={(e) => setEthPrice(Number(e.target.value))}
          />
        </div>
      </div>

      <div className={styles.results} aria-live="polite">
        <div className={styles.result}>
          <span className={styles.resultLabel}>XDC cost</span>
          <span className={styles.resultValue}>
            {xdcCost.toFixed(8)} XDC
            <span className={styles.resultSub}>{formatUsd(xdcUsd)}</span>
          </span>
        </div>
        <div className={styles.result}>
          <span className={styles.resultLabel}>ETH cost @ {ethGasPrice} Gwei</span>
          <span className={styles.resultValue}>
            {ethCost.toFixed(8)} ETH
            <span className={styles.resultSub}>{formatUsd(ethUsd)}</span>
          </span>
        </div>
        <div className={styles.result}>
          <span className={styles.resultLabel}>Savings</span>
          <span className={styles.resultAccent}>
            {multiplier.toFixed(0)}× cheaper on XDC
          </span>
        </div>
      </div>

      <p className={styles.note}>
        XDC cost uses the standard 0.25 Gwei gas price. USD estimate uses your
        input price.
      </p>
    </div>
  );
}
