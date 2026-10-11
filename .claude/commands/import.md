# import

Read docs/replace-award-force.md. Import a single season with a dry run first. Reconcile counts and source columns.

Use `npm run awards -- import award-force` with the required flags from `help`: --season --file --mapping --dry-run --actor. Every command accepts --json. Ask for missing human evidence before a mutation. Every change needs --actor and season-scoped changes need --season. Never fabricate records, send messages or publish results.
