/**
 *
 * @typedef {import('./index').Info} Info
 */
import fs from 'fs/promises';
import fse from 'fs-extra';
import latestVersion from 'latest-version';

import { setupJs } from './js/index.js';
import { setupTs } from './ts/index.js';

/**
 * @param {Info} info
 */
export async function migrateAddon(info) {
  let { workspace, isTs } = info;

  if (!fse.existsSync('addon')) {
    fse.mkdirSync('addon');
    console.info('Unable to find "addon" folder, empty folder created');
  }

  const entryFilePath = isTs ? 'addon/index.ts' : 'addon/index.js';

  if (!fse.existsSync(entryFilePath)) {
    fse.writeFileSync(entryFilePath, '', 'utf8');
    console.info(`Unable to find "${entryFilePath}" entrypoint, empty entrypoint created`);
  }

  await fse.move('addon', `${workspace}/src`);
  await writeAddonPackageJson(info);

  if (isTs) {
    await setupTs(info);
  } else {
    await setupJs(info);
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
    exports: {},
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
        '@babel/plugin-proposal-decorators',
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

  if (old.engines) {
    newInfo.engines = old.engines;
  }

  if (old.volta) {
    newInfo.volta = {
      extends: '../package.json',
    };
  }

  // TODO: narrow this down to what was in the original addon
  newInfo.exports = {
    '.': './dist/index.js',
    './*': './dist/*',
  };

  if (isTs) {
    newInfo.types = 'dist';
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

  await fs.writeFile(`${workspace}/package.json`, JSON.stringify(newInfo, null, 2));
}

/**
 * @param {string[]} packageList
 */
async function withVersions(packageList) {
  /** @type {Record<string, string>} */
  let mapped = {};

  const versions = await Promise.all(
    packageList.map((name) => {
      return latestVersion(name);
    })
  );

  // keep ordering consistent between migration
  packageList.forEach((name, index) => {
    mapped[name] = versions[index];
  });

  return mapped;
}
