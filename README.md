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

Be sure to check out `npx ember-addon-migrator --help` for a full list of commands and options.
(Noting that to see options' help, you'll need to specify the command, e.g.: `npx ember-addon-migrator extract-tests --help`)

## Parameters

Parameters follow naming of args used in the [v2 addon blueprint](https://github.com/embroider-build/addon-blueprint)

### `--addon-location`

Places the addon in `--addon-location` instead of `{addon-name}`

## Other Commands 

### `npx ember-addon-migrator extract-tests`

This command takes a v1 addon (default to the current directory), 
and pulls the tests out of it and places them in a new test app.

This is a good thing to do for repos, or projects that are generally low maintenance, 
or if the project maintainers don't have all the details on v2 addon migration.
Additionally! this style of workflow is much easier to review, and is the best way to transfer
knowledge about v2 addon conversion!

Example workflow:

- PR: Convert project to monorepo with single workspace.
  - move all files (except `.git`, `.github`) to a "sub-folder"
  - create a root package.json / workspaces file (depending on your package-manager)
  - add the sub-folder to the list of workspaces
- Optional PR: convert the project to [pnpm](https://pnpm.io/).
  npm and yarn(@v1) have a long history in the JS Ecosystem, but they are fundamentally bad at what they were designed to do, and will cause problems in monorepos -- especially as they relate to peerDependencies.
- PR: Extract the tests from the addon to a separate test-app.
- PR: Do an in-place conversion of the v1 addon in "sub-folder" to a v2 addon. 
  The default command for `ember-addon-migrator` will do this for you via `--exclude-tests` or `--in-place` (these flags are aliases of each-other)
  

#### Parameters 

##### `--test-app-location`

##### `--directory`

##### `--in-place`

##### `--addon-location`

##### `--test-app-name`



### `npx ember-addon-migrator reset`

Resets the git workspace by running:
```bash 
git clean -f -d 
git checkout .
rm -rf node_modules
```

This can be useful for development of the addon-migrator when trying on real projects and wanting to quickly undo work.

## Compatibility

 - Node 16+

## Contributing

 - clone the repo
 - `cd ember-addon-migrator`
 - `yarn`
 - cd to your v1 addon for testing
 - run `node ../path/to/ember-addon-migrator/bin.js`
