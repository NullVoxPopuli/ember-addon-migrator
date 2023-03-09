---
"ember-addon-migrator": patch
---

Fix an issue where an addon has a scoped package name, ember-cli will turn the package name into a dasherized version of it as the addon location, which then would not match the location we were expecting. This happened when generating the temporary addon that files get pulled from for migration / merging with the existing addon.
