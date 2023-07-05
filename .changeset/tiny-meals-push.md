---
'ember-addon-migrator': patch
---

Fix copying test files

At a previous iteration a regression was introduced, that copied the test files into the test-app, but including their full path. This is fixed now.
