---
"ember-addon-migrator": patch
---

extract-tests: remove unused test scripts and devDeps from addon
As the addon does not contain any tests anymore, we can remove package.json scripts and devDependencies that relate to testing.
