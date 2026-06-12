## Best Practices

### Schema Design

1. **Normalize Entities:** Separate concerns into distinct entities with relationships
2. **Use IDs Strategically:** Composite IDs prevent collisions (e.g., `token-address`)
3. **Index Frequently Queried Fields:** Add `@index` directive for performance
4. **Avoid Deep Nesting:** Limit entity relationships to 2-3 levels
5. **Document Fields:** Add comments explaining non-obvious fields

### Mapping Development

1. **Handle Edge Cases:** Zero values, self-transfers, reverted transactions
2. **Validate Inputs:** Check addresses and values before processing
3. **Minimize Storage:** Only store data your application needs
4. **Use Constants:** Define magic numbers as named constants
5. **Test Thoroughly:** Unit tests for all event handlers

### Deployment

1. **Version Control:** Tag subgraph versions for reproducibility
2. **Monitor Indexing:** Track sync status and error rates
3. **Backup Manifests:** Store subgraph.yaml in version control
4. **Document Changes:** Maintain changelog for schema updates
5. **Plan Migrations:** Schema changes require new deployments

### Querying

1. **Paginate Results:** Never request unbounded lists
2. **Cache Responses:** Implement client-side caching for static data
3. **Batch Requests:** Combine multiple queries when possible
4. **Handle Errors:** Implement retry logic for failed queries
5. **Optimize Complexity:** Simplify queries to reduce load

---

