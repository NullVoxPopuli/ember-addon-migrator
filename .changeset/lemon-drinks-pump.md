---
"ember-addon-migrator": major
---

Support running the migrator in existing monorepos, at any depth.

Additionally, support for

- npm, yarn, pnpm
- typescript

(because the migration is now powered by the v2 addon blueprint)

Details:

- analyzes imports to more correctly move dependencies from the old package.json to the new locations
