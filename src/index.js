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
 * @property {Record<string, any>} [ exports ]
 *
 * @typedef {PackageExtras & BasicPackage} PackageJson
 *
 */
import fse from 'fs-extra';
import semver from 'semver';
import { packageJson } from 'ember-apply';

import { migrateAddon } from './addon.js';
import { migrateTestApp } from './test-app.js';
import { writeRootPackageJson } from './workspaces.js';
import { error, info } from './log.js';

/**
 * @param {string} workingDirectory - the directory `npx ember-apply` was invoked fromm
 */
export default async function run(workingDirectory) {
  let analysis = await analyze();

  if (analysis.isV2 || !analysis.isAddon) {
    error('Package is either not an addon or is already V2');

    return;
  }

  try {
    await writeRootPackageJson(analysis);
    await migrateAddon(analysis);
    await migrateTestApp(analysis);
  } catch (/** @type {any} */ e) {
    error(`
      Error occurred
        You may want to reset your repository and try again.
        Errors encountered during migration are likely unrecoverable.
    `);
    error(e.message);

    throw e;
  }

  info(`
    🎉 Congratulations! Your addon is now formatted as a V2 addon!

    Next steps:
     - customize the rollup.config.js to suit your needs
     - audit dependencies of both the new addon and test-app
     - run \`${analysis.packager} install\`
     - run \`${analysis.packager} run lint:fix\` in each workspace
     - test your addon in ./test-app
     - push up a branch, merge, release
     - party 🥳
  `);
}

/**
 * @typedef {object} Info
 * @property {boolean} isTs
 * @property {string} workspace
 * @property {string} testWorkspace
 * @property {string} packageName
 * @property {string} emberCliVersion
 * @property {'yarn' | 'npm' | 'pnpm'} packager
 * @property {PackageJson} packageInfo
 * @property {boolean} isAddon
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
  let name = packageInfo.name || '';
  let workspace = name.split('/')[1] ?? name;

  let isYarn = fse.existsSync('yarn.lock');
  let isNpm = fse.existsSync('package-lock.json');
  const packager = (isYarn && 'yarn') || (isNpm && 'npm') || 'pnpm';

  let emberCli = 'latest';

  if (packageInfo.devDependencies) {
    let coerced = semver.coerce(packageInfo.devDependencies['ember-cli']);

    if (coerced) {
      emberCli = `${coerced}`;
    }
  }

  return {
    isTs,
    packager,
    packageInfo,
    workspace,
    testWorkspace: 'test-app',
    packageName: name,
    emberCliVersion: emberCli,
    isAddon: Boolean(packageInfo['ember-addon']),
    isV2: packageInfo['ember-addon']?.version === 2,
  };
}
