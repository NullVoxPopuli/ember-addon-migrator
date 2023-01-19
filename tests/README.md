# Tests

## Debugging

### View all commands

```bash
pnpm dev --help
```

### Debug the migration tool

#### With a fixture

```bash
pnpm dev output <fixture-name>
```

This outputs the fixture to a tmp directory.
After `cd`ing to the tmp directory, open a VSCode instance.
Add ember-addon-migrator as a "workspace" so you can add breakpoints.
Then, open the JavaScript Debug Terminal, and run:
```bash
node ~/path/to/ember-addon-migrator/cli/bin.js
```


### Debug a transformed fixture

```bash
pnpm dev migrate <fixture-name>
```

Allows you to inspect and tweak fixtures post-migration.
Also a good command to use with the VSCode JavaScript Debug Terminal.
