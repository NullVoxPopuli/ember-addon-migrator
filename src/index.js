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
 * @property {string} [types]
 * @property {any} [release]
 * @property {any} [msw]
 * @property {Record<string, string>} [ publishConfig ]
 * @property {Record<string, any>} [ exports ]
 *
 * @typedef {PackageExtras & BasicPackage} PackageJson
 *
 */
import path from 'path';
import assert from 'assert';
import fse from 'fs-extra';
import semver from 'semver';
import { execa } from 'execa';
import { packageJson } from 'ember-apply';
import Listr from 'listr';

import { migrateAddon } from './addon.js';
import { createTmp, prepare } from './prepare.js';
import { migrateTestApp } from './test-app.js';
import { updateRootFiles } from './workspaces.js';
import { error, info } from './log.js';
import { installV2Blueprint } from './v2-blueprint.js';

/**
 * @typedef {object} Options
 * @property{string} addonLocation
 * @property{string} testAppLocation
 * @property{string} testAppName
 * @property{string} directory
 *
 * @param {Options} options
 *
 */
export default async function run(options) {
  await verifyOptions(options);

  let analysis = await analyze(options);

  if (analysis.isV2 || !analysis.isAddon) {
    error('Package is either not an addon or is already V2');

    if (analysis.packageInfo) {
      info(`Tried to convert ${analysis.packageInfo.name} to a v2 addon`);
    } else {
      error(
        'package.json not found. Please either run ember-addon-migrator from a package directory, or specify a path to a package directory via --directory'
      );
    }

    return;
  }

  try {
    let tasks = new Listr([
      {
        title: `Copying addon to tmp directory, ${analysis.tmpAddonLocation}`,
        task: () => prepare(analysis),
      },
      {
        title: 'Installing the V2 Addon Blueprint',
        task: () => installV2Blueprint(analysis),
      },
      {
        title: 'Updating root files',
        task: () => updateRootFiles(analysis),
      },
      {
        title: 'Migrating addon files',
        task: () => migrateAddon(analysis),
      },
      {
        title: 'Migrating test files',
        task: () => migrateTestApp(analysis),
      },
    ]);

    await tasks.run();
  } catch (/** @type {any} */ e) {
    error(`
      Error occurred
        You may want to reset your repository and try again.
        Errors encountered during migration are likely unrecoverable.

        the addon-migrator can do this for you via

        migrate-addon reset

        aliased as both:
          ea2 reset
          ember-addon-migrator reset
    `);
    error(e.message);
    throw e;
  }

  info(
    `
    🎉 Congratulations! Your addon is now formatted as a V2 addon!

    Next steps:
     - customize the rollup.config.js to suit your needs
     - audit dependencies of both the new addon and test-app
     - run \`${analysis.packager} install\`
     - run \`${analysis.packager} ` +
      `${analysis.packager === 'npm' ? 'run ' : ''}lint:fix\` in each workspace
     - test your addon \`cd test-app; ${analysis.packager} test\`
     - push up a branch, merge, release
     - party 🥳
  `
  );
}

/**
 * @typedef {object} Info
 * @property {boolean} isTs
 * @property {boolean} isYarn
 * @property {boolean} isNpm
 * @property {boolean} isPnpm
 * @property {boolean} isBiggerMonorepo if true, this tool will not create a top-level / workspaces package.json
 * @property {string} workspace
 * @property {string} addonLocation
 * @property {string} testWorkspace
 * @property {string} testAppLocation
 * @property {string} testAppName
 * @property {string} repoRoot
 * @property {string} directory the directory to run the migration in
 * @property {string} tmpAddonLocation the tmp directory where the original addon files are moved
 * @property {string} packagerRoot
 * @property {string} packageName
 * @property {string} emberCliVersion
 * @property {'yarn' | 'npm' | 'pnpm'} packager
 * @property {PackageJson} packageInfo
 * @property {boolean} isAddon
 * @property {boolean} isV2
 *
 * @param {Options} options
 * @returns {Promise<Info>}
 */
async function analyze(options) {
  let isTs = await packageJson.hasDependency('typescript');
  /** @type {any} */
  let pkgJson = await packageJson.read();

  /** @type {PackageJson} */
  let packageInfo = pkgJson;
  let name = packageInfo.name || '';
  let workspace = options.addonLocation || (name.split('/')[1] ?? name);

  let repoRoot = await findRoot();
  let { packager, packagerRoot } = await guessPackager(repoRoot, options);

  let emberCli = 'latest';

  if (packageInfo.devDependencies) {
    let coerced = semver.coerce(packageInfo.devDependencies['ember-cli']);

    if (coerced) {
      emberCli = `${coerced}`;
    }
  }

  let directory = resolvedDirectory(options.directory);

  let tmpAddonLocation = await createTmp(`${name}-original--`);

  return {
    isTs,
    isYarn: packager === 'yarn',
    isNpm: packager === 'npm',
    isPnpm: packager === 'pnpm',
    isAddon: Boolean(packageInfo['ember-addon']),
    isV2: packageInfo['ember-addon']?.version === 2,
    isBiggerMonorepo: packagerRoot !== directory,
    repoRoot,
    packager,
    packagerRoot,
    packageInfo,
    packageName: name,
    addonLocation: workspace,
    testAppName: options.testAppName,
    testAppLocation: options.testAppLocation,
    directory,

    // The tmp directory where addon files are moved
    tmpAddonLocation,

    // same as addonLocation
    workspace,
    // same as testAppLocation
    testWorkspace: options.testAppLocation,
    emberCliVersion: emberCli,
  };
}

async function findRoot() {
  let { stdout } = await execa('git', ['rev-parse', '--show-toplevel']);

  return stdout;
}

/**
 * @param {string} root
 * @param {Options} options

 * @returns {Promise<{ packager: 'yarn' | 'npm' | 'pnpm', packagerRoot: string }>}
 */
async function guessPackager(root, options) {
  let isYarn = false;
  let isNpm = false;
  let isPnpm = false;
  let dir = options.directory;
  let paths = [];
  let packagerRoot = root;

  while (dir !== path.dirname(root)) {
    paths.push(dir);
    isYarn = fse.existsSync(path.join(dir, 'yarn.lock'));
    isNpm = fse.existsSync(path.join(dir, 'package-lock.json'));
    isPnpm = fse.existsSync(path.join(dir, 'pnpm-lock.yaml'));

    if (isYarn || isNpm || isPnpm) {
      packagerRoot = dir;

      break;
    }

    dir = path.dirname(dir);
  }

  if (!isYarn && !isNpm && !isPnpm) {
    throw new AnalysisError(`Could not determine packager. Searched in: ${paths.join(', ')}`);
  }

  const packager = (isYarn && 'yarn') || (isNpm && 'npm') || 'pnpm';

  return { packager, packagerRoot };
}

class AnalysisError extends Error {}

/**
 * @param {Options} options
 */
async function verifyOptions(options) {
  if (options.addonLocation) {
    assert(
      /[-\s/\\]/.test(options.addonLocation),
      `--addon-location may not contain invisible characters or slashes. Received: ${options.addonLocation}`
    );
  }

  if (options.testAppLocation) {
    assert(
      /[-\s/\\]/.test(options.testAppLocation),
      `--test-app-location may not contain invisible characters or slashes. Received: ${options.testAppLocation}`
    );
  }

  if (options.testAppName) {
    if (
      !(
        (options.testAppName.includes('@') && options.testAppName.startsWith('@')) ||
        /[a-z-]+/.test(options.testAppName)
      )
    ) {
      console.warn(
        `--test-app-name may not contain the '@' character in any position other than the first character. Also, a package name may only be kebab-case, using a lowercase latin alphabet.`
      );
    }
  }

  if (options.directory) {
    let absolute = resolvedDirectory(options.directory);

    assert(path.resolve(absolute), `Directory, ${absolute}, does not exist.`);
  }
}

/**
 * @param {string} directory;
 */
function resolvedDirectory(directory) {
  /** @type {string} */
  let absolute;

  if (directory.startsWith('/')) {
    absolute = directory;
  } else {
    absolute = path.resolve(path.join(process.cwd(), directory));
  }

  return absolute;
}
