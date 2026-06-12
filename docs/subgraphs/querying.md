## Querying Subgraphs

### GraphQL Queries

Subgraphs expose a GraphQL endpoint for flexible data retrieval.

**Query Structure:**

```graphql
query GetTransfers($first: Int!, $skip: Int!) {
  transfers(
    first: $first
    skip: $skip
    orderBy: timestamp
    orderDirection: desc
  ) {
    id
    from {
      id
    }
    to {
      id
    }
    value
    timestamp
    transactionHash
  }
}
```

**Variables:**

```json
{
  "first": 10,
  "skip": 0
}
```

### Pagination

Use `first` and `skip` for offset-based pagination:

```graphql
query PaginatedTransfers($first: Int!, $skip: Int!) {
  transfers(first: $first, skip: $skip) {
    id
    value
  }
}
```

**Best Practice:** Limit `first` to 1000 maximum. For large datasets, use cursor-based pagination with `id` filtering:

```graphql
query CursorPagination($lastId: ID!) {
  transfers(
    first: 1000
    where: { id_gt: $lastId }
    orderBy: id
    orderDirection: asc
  ) {
    id
    value
  }
}
```

### Filtering

Apply `where` clauses for precise data selection:

```graphql
query FilteredTransfers {
  transfers(
    where: {
      value_gt: "1000000000000000000"
      timestamp_gt: "1700000000"
    }
  ) {
    id
    from {
      id
    }
    to {
      id
    }
    value
  }
}
```

**Available Operators:**

| Operator | Description |
|----------|-------------|
| `_eq` | Equal |
| `_gt` | Greater than |
| `_lt` | Less than |
| `_gte` | Greater than or equal |
| `_lte` | Less than or equal |
| `_in` | In array |
| `_not_in` | Not in array |
| `_contains` | Contains substring |
| `_starts_with` | Starts with |
| `_ends_with` | Ends with |

### Sorting

Order results with `orderBy` and `orderDirection`:

```graphql
query SortedTransfers {
  transfers(
    orderBy: timestamp
    orderDirection: desc
    first: 50
  ) {
    id
    timestamp
    value
  }
}
```

### Time-Travel Queries

Query historical state at a specific block:

```graphql
query HistoricalState {
  token(id: "0x...", block: { number: 50000000 }) {
    totalSupply
    holderCount
  }
}
```

### Real-Time Subscriptions

WebSocket subscriptions for live data updates:

```javascript
import { createClient } from 'graphql-ws';

const client = createClient({
  url: 'wss://api.thegraph.com/subgraphs/name/username/xdc-token-indexer'
});

const subscription = client.subscribe(
  {
    query: `
      subscription OnNewTransfer {
        transfers(orderBy: timestamp, orderDirection: desc, first: 1) {
          id
          from { id }
          to { id }
          value
        }
      }
    `
  },
  {
    next: (data) => console.log('New transfer:', data),
    error: (err) => console.error(err),
    complete: () => console.log('Done')
  }
);
```

---

