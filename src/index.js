// @ts-check

/**
 * @typedef {import('types-package-json').PackageJson} BasicPackage
 *
 * @typedef {object} EmberAddon
 * @property {number} version
 * @property {string} type
 * @property {string} main
 * @property {Record<string, string>} app-js
 *
 * @typedef {object} Ember
 * @property {'octane'} [edition]
 *
 * @typedef {object} Volta
 * @property {string} [ node ]
 * @property {string} [ yarn ]
 * @property {string} [ npm ]
 * @property {string} [ extends ]
 *
 * @typedef {object} PackageExtras
 * @property {Volta} [volta]
 * @property {Ember} [ember]
 * @property {EmberAddon} [ember-addon]
 * @property {boolean} [private]
 * @property {string[]} [workspaces]
 * @property {Record<string, string>} [ publishConfig ]
 *
 * @typedef {PackageExtras & BasicPackage} PackageJson
 *
 */
import fs from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fse from 'fs-extra';

import { packageJson } from 'ember-apply';
import { migrateAddon } from './addon.js';
import { migrateTestApp } from './test-app.js';

/**
 * @param {string} workingDirectory - the directory `npx ember-apply` was invoked fromm
 */
export default async function run(workingDirectory) {
  let info = await analyze();

  if (info.isV2) {
    return;
  }

  await writeRootPackageJson(info);
  await migrateAddon(info);
  await migrateTestApp(info);

  console.info(`
    🎉 Congratulations! Your addon is now formatted as a V2 addon!

    Next steps:
     - run \`${info.packager} install\`
     - run \`${info.packager} run lint:fix\` in each workspace
     - test your addon in ./test-app
     - push up a branch
     - merge
     - release
     - party 🥳
`);
}

/**
 * @typedef {object} Info
 * @property {boolean} isTs
 * @property {string} workspace
 * @property {string} packageName
 * @property {'yarn' | 'npm' | 'pnpm'} packager
 * @property {PackageJson} packageInfo
 * @property {boolean} isV2
 *
 * @returns {Promise<Info>}
 */
async function analyze() {
  let isTs = await packageJson.hasDependency('typescript');
  /** @type {any} */
  let pkgJson = await packageJson.read();

  /** @type {PackageJson} */
  let packageInfo = pkgJson;
  let name = packageInfo.name;
  let workspace = name.split('/')[1] ?? name;

  let isYarn = fse.existsSync('yarn.lock');
  let isNpm = fse.existsSync('package-lock.json');
  const packager = (isYarn && 'yarn') || (isNpm && 'npm') || 'pnpm';

  return {
    isTs,
    packager,
    packageInfo,
    workspace,
    packageName: name,
    isV2: packageInfo['ember-addon']?.version === 2,
  };
}

/**
 * @param {Info} info
 */
async function writeRootPackageJson(info) {
  let rootJson = workspacePackageJsonFrom(info);

  // root package.json must not contain 'ember-cli',
  // otherwise ember-cli doesn't work :(
  await fs.writeFile('package.json', JSON.stringify(rootJson, null, 2));
}

/**
 * @param {Info} info
 */
function workspacePackageJsonFrom(info) {
  let { workspace, packageInfo: old, packager } = info;

  /** @type {Partial<PackageJson>} */
  let rootJson = {
    private: true,
    workspaces: [workspace, 'test-app'],
    repository: old.repository,
    license: old.license,
    author: old.author,
    scripts: {},
  };

  if (packager === 'yarn') {
    rootJson.scripts = {
      ...rootJson.scripts,
      build: `yarn workspace ${workspace} build`,
      prepare: `yarn build`,
    };
  }

  if (old.volta) {
    rootJson.volta = old.volta;
  }

  if (old.engines) {
    rootJson.engines = old.engines;
  }

  return rootJson;
}

// @ts-ignore
const __dirname = dirname(fileURLToPath(import.meta.url));

run.path = __dirname;
