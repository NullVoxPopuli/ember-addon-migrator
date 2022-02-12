# ember-addon-migrator

Migrate your V1 addons to V2 addons

```bash
# in the root of your addon
npx ember-addon-migrator
```

This command will move all your addon files into two new locations:
```
{your-addon-name}/
  - plain / normal npm package built with rollup
  - src/
    - your files that were previously in addon/

test-app/
  - brand new ember app setup with the same ember-try config
    as your addon was configured with
  - tests/
    - your files that were previously in tests/
```

_Additional tweaking may be required after the migrator runs_.

## Compatibility

 - Node 16+

## Contributing

 - clone the repo
 - `cd ember-addon-migrator`
 - `yarn`
 - cd to your v1 addon for testing
 - run `node ../path/to/ember-addon-migrator/bin.js`
