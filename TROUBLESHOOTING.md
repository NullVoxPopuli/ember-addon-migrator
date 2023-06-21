# Troubleshooting

## Unexpected changes in the lockfile

Running this migrator should not cause changes to your npm/yarn/pnpm lockfile, especially to existing dependencies?

```
npx ember-addon-migrator extract-tests --reuse-existing-versions
```

Using `--reuse-existing-versions` should help lock down the dependencies to the versions you have in your existing project.

After this, do a `git diff` to inspect what new dependencies the migrator has added. Are these dependencies currently used in your project? If so, they should match your current project using the `--reuse-existing-versions` flag.

If there are new dependencies the migrator has added, they might be needed for v2 addons.

See the following for reference: https://github.com/embroider-build/embroider/blob/main/docs/porting-addons-to-v2.md#part-4-convert-addon-to-v2


## Typescript errors

If you encounter typescript errors that you haven't seen before, copy over the contents of the original `types` folder (pre-migration). 

The migrator overrides the types folder types needed for a v2 addon, it's possible your original types have been deleted. 


## Unexpected errors in the test-app

### Failing tests

If you have tests failing that were not failing before, there are a few culprits:

1. missing items in the `test-app/tests/index.html` file. For example, your original `tests/index.html` might have `{{content-for "something"}}` that is now missing in the index file.
2. removing test scripts from the `package/package.json` npm scripts. Remember, tests area now run in the `test-app`, so no need to run any tests in `/package`!
3. if you have a monorepo, remove any configuration to run tests in the new `package` and run them in `test-app` instead. 
4. double-check that the v2 addon has been added to the `test-app` in the package.json dependencies (NOT dev dependencies)

```js
// in test-app/package.json
"dependencies": {
  "@org/your-v2-addon-from-the-package-folder": "*"
}
```

### Cannot run test-app locally

If you cannot run the test-app locally, you will need to update the import paths in a few places:

For example, the migrator creates the `test-app` package name as `test-app`.

This name, `test-app` is copied into a few places:

1. `test-app/app/app.ts`
2. `test-app/app/index.html`
3. `test-app/app/router.ts`
4. `test-app/config/environment.ts`
5. `test-app/tests/index.html`
6. `test-app/tests/test-helper.ts`

If you update the name of `test-app` in the package.json `name`, then those places above need to be updated.

## Monorepo specific troubleshooting

### Unexpected stylelint, prettier or eslint errors

`ember-addon-migrator` copies over best-practises stylelint, prettier and eslint configs. But this might not be what you need in your monorepo.

If you get errors, delete these related configs (stylelint, prettier or eslint), nuke your node_modules and try again.

### Unexpected config errors

If you had a config folder, the contents of this get copied over with what `ember-addon-migrator` has for sensible v2 defaults. This might cause you to have build errors.

The fix: copy over the original configs into both:

1. `package/config`
2. `test-app/config`.

### Packages consuming the new v2 addon `package` can't find the new v2 addon

If you have packages or apps in your monorepo that consume the newly migrated v2 addon, but they can't seem to find it, this is because the `path` in the external `tsconfig` needs to be migrated.

```diff
// the tsconfig.json app "bar" that consumes your new v2 addon "foo"
"references": [
    {
-       "path": "../packages/my-new-v2-addon", 
+       "path": "../packages/my-new-v2-addon/package", 
    }
]
```




