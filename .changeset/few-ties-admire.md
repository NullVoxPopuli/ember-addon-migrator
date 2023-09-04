---
'ember-addon-migrator': minor
---

Add `--exclude-tests`` to support two-phased migration

With this flag added, you can migrate an existing v1 addon with a previously extracted test-app. This lets you you can apply a migration in two phases:

1. `npx ember-addon-migrator extract-tests`
2. `npx ember-addon-migrator --exclude-tests`
