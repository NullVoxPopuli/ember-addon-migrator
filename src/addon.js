/**
 *
 * @typedef {import('./index').Info} Info
 */
import path from 'path';
import { fileURLToPath } from 'url';
import fse from 'fs-extra';
import latestVersion from 'latest-version';
import { files } from 'ember-apply';

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {Info} info
 */
export async function migrateAddon(info) {
  let { workspace, isTs } = info;

  await fse.move('addon', `${workspace}/src`);
  await writeAddonPackageJson(info);

  if (isTs) {
    let tsFiles = path.join(__dirname, 'ts', 'files');

    await files.applyFolder(tsFiles, workspace);
  } else {
    let jsFiles = path.join(__dirname, 'js', 'files');

    await files.applyFolder(jsFiles, workspace);
  }
}

/**
 * @param {Info} info
 */
async function writeAddonPackageJson(info) {
  let { workspace, isTs, packageInfo: old, packager } = info;

  /** @type {Partial<import('./index').PackageJson>} */
  let newInfo = {
    name: info.packageName,
    version: old.version,
    description: old.description,
    repository: old.repository,
    license: old.license,
    author: old.author,
    files: ['dist', 'addon-main.cjs', 'CHANGELOG.md', 'README.md'],
    scripts: {
      start: `concurrently 'npm:watch:*'`,
      build: `concurrently 'npm:build:*'`,
      'build:js': 'rollup -c ./rollup.config.js',
      'build:docs': 'cp ../README.md ./README.md',
      'watch:js': 'rollup -c --watch --no-watch.clearScreen',
      lint: `concurrently 'npm:lint:js'`,
      'lint:fix': `concurrently 'npm:lint:js:fix'`,
      'lint:js': 'eslint . --cache',
      'lint:js:fix': 'eslint . --fix',
      test: "echo 'Addon does not have tests, run tests in test-app'",
      prepare: `${packager} run build`,
      prepublishOnly: `${packager} run build`,
    },
    dependencies: await withVersions(['@embroider/addon-shim']),
    devDependencies: {
      ...(await withVersions([
        '@babel/core',
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-syntax-decorators',
        '@embroider/addon-dev',
        '@nullvoxpopuli/eslint-configs',
        'concurrently',
        'eslint-config-prettier',
        'eslint-plugin-decorator-position',
        'eslint-plugin-ember',
        'eslint-plugin-import',
        'eslint-plugin-json',
        'eslint-plugin-node',
        'eslint-plugin-prettier',
        'eslint-plugin-simple-import-sort',
        'rollup',
        'babel-eslint',
      ])),
      eslint: '^7.0.0',
    },
    publishConfig: {
      registry: 'https://registry.npmjs.org',
    },
    ember: {
      edition: 'octane',
    },
    'ember-addon': {
      version: 2,
      type: 'addon',
      main: './addon-main.cjs',
      'app-js': {},
    },
  };

  if (old.volta) {
    newInfo.volta = {
      extends: '../package.json',
    };
  }

  if (isTs) {
    newInfo.devDependencies = {
      ...newInfo.devDependencies,
      ...(await withVersions([
        '@babel/plugin-transform-typescript',
        '@babel/preset-typescript',
        'rollup-plugin-ts',
        'typescript',
      ])),
    };
  } else {
    newInfo.devDependencies = {
      ...newInfo.devDependencies,
      ...(await withVersions(['@rollup/plugin-babel'])),
    };
  }
}

/**
 * @param {string[]} packageList
 */
async function withVersions(packageList) {
  /** @type {Record<string, string>} */
  let mapped = {};

  await Promise.all(
    packageList.map(async (name) => {
      let version = await latestVersion(name);

      mapped[name] = `^${version}`;
    })
  );

  return mapped;
}
