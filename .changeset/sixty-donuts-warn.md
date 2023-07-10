---
'ember-addon-migrator': minor
---

Use latest Ember CLI when generating from blueprints

We use the version of Ember CLI that we depend on (currently latest `5.2.0-beta.0`) instead of what the user has when delegating to other blueprints (app, v2 addon), so we get to use the latest blueprint features. In particular this relates to the improved `--typescript` support that was introduced in that version of Ember CLI.
