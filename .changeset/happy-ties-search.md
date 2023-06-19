---
"ember-addon-migrator": minor
---

Two new flags for managing dependencies:

- `--reuse-existing-versions`
  When the test-app is generated, instead of using the (latest) dependency versions of the app blueprint it will try to use the same versions previously used in the addon.

- `--ignore-new-dependencies`
  When the test-app is generated, any dependencies that are part of the default app blueprint which were not used before will be ignored. WARNING: there is a considerable risk that this leaves your dependencies in a broken state, use it only with great caution!

These two flags are available for both the default command (run), and extract-tests.
See `--help` for more information.
