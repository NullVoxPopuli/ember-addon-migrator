---
"ember-addon-migrator": minor
---

Add new flag, `--reuse-existing-configs` to both the default command and `extract-tests`

When used, this will copy the existing configs to the new test-app, rather than using the defaults.
This is helpful for when a project's configs are resilient to directory and project changes.

For examples of such configs, see:

- https://github.com/NullVoxPopuli/eslint-configs
- https://github.com/embroider-build/addon-blueprint/issues/71#issuecomment-1341912431
