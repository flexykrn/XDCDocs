## Performance Optimization

### Indexing Optimization

**Selective Indexing:**

Set `startBlock` to the contract deployment block to avoid processing unnecessary history:

```yaml
source:
  startBlock: 61580000  # Contract deployment block
```

**Event Filtering:**

Index only relevant events. Avoid indexing common events like `Approval` if not needed.

**Batch Processing:**

Process multiple entities in a single handler when possible:

```typescript
export function handleBatchTransfer(event: BatchTransferEvent): void {
  let recipients = event.params.recipients;
  let amounts = event.params.amounts;
  
  for (let i = 0; i < recipients.length; i++) {
    // Process each transfer in batch
    createTransfer(recipients[i], amounts[i]);
  }
}
```

### Query Optimization

**Field Selection:**

Request only needed fields to reduce response size:

```graphql
# Good: Minimal fields
query {
  transfers(first: 10) {
    id
    value
  }
}

# Avoid: Unnecessary nested data
query {
  transfers(first: 10) {
    id
    from { id balances { id token { id symbol name decimals } } }
    to { id balances { id token { id symbol name decimals } } }
  }
}
```

**Query Complexity:**

The Graph limits query complexity. Deep nesting and large `first` values may be rejected.

### Caching Strategies

**Client-Side Caching:**

```javascript
import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/username/xdc-indexer',
  cache: new InMemoryCache()
});
```

**CDN Caching:**

Configure cache headers for repeated queries:

```javascript
fetch(subgraphUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'max-age=60'
  },
  body: JSON.stringify({ query })
});
```

---

