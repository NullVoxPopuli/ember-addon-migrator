// @ts-check

import Listr from 'listr';
import assert from 'node:assert';
import path from 'node:path';
import util from 'node:util';

import { migrateAddon } from './addon.js';
import { AddonInfo } from './analysis/index.js';
import { resolvedDirectory } from './analysis/paths.js';
import { lintFix } from './lint.js';
import { error, info } from './log.js';
import { prepare } from './prepare.js';
import { migrateTestApp } from './test-app.js';
import { installV2Blueprint } from './v2-blueprint.js';
import { install, updateRootFiles } from './workspaces.js';

/**
 * @param {import('./types').Options} options
 */
export default async function run(options) {
  await verifyOptions(options);

  let targetAddon = resolvedDirectory(options.directory);

  process.chdir(targetAddon);

  /** @type {AddonInfo} */
  let analysis;

  try {
    let tasks = new Listr([
      {
        title: `Analyzing the addon`,
        task: async () => {
          analysis = await AddonInfo.create(options);

          if (options.analysisOnly) {
            console.debug(
              util.inspect(analysis, { showHidden: true, getters: true })
            );
          }
        },
      },
      {
        title: 'Running Migrator',
        skip: () => options.analysisOnly,
        task: () => {
          return new Listr([
            {
              title: `Moving addon to tmp directory, ${analysis.tmpLocation}`,
              task: () => prepare(analysis),
            },
            {
              title: 'Installing the V2 Addon Blueprint',
              task: () => installV2Blueprint(analysis),
            },
            {
              title: `Updating addon's root files`,
              task: () => updateRootFiles(analysis),
            },
            {
              title: 'Migrating addon files',
              task: () => {
                return migrateAddon(analysis);
              },
            },
            {
              title: 'Migrating test files',
              task: () => migrateTestApp(analysis, options),
            },
          ]);
        },
      },
      {
        title: 'Running package manager',
        task: () => install(analysis, { hidden: true }),
      },
      {
        title: 'Running lint:fix',
        task: () => {
          return new Listr([
            {
              title: `lint:fix on ${analysis.name}`,
              task: () => lintFix(analysis, analysis.addonLocation),
            },
            {
              title: `lint:fix on test app`,
              task: () => lintFix(analysis, analysis.testAppLocation),
            },
          ]);
        },
      },
    ]);

    await tasks.run().then(() => {
      if (options.analysisOnly) return;

      info(
        `\n\n` +
          `🎉 Congratulations! Your addon is now formatted as a V2 addon!\n` +
          `\n` +
          `Next steps:\n` +
          ` - customize the rollup.config.js to suit your needs\n` +
          ` - audit dependencies of both the new addon and test-app\n` +
          ` - run \`${analysis.packageManager} install\`\n` +
          ` - run \`${analysis.packageManager} ` +
          `${
            analysis.packageManager === 'npm' ? 'run ' : ''
          }lint:fix\` in each workspace\n` +
          ` - test your addon \`cd test-app; ${analysis.packageManager} test\`\n` +
          ` - push up a branch, merge, release\n` +
          ` - party 🥳\n`
      );
    });
  } catch (/** @type {any} */ e) {
    if (process.env.DEBUG) {
      console.info('Detected options: ', util.inspect(options));
      throw e;
    } else {
      error(`
      Error occurred
        You may want to reset your repository and try again.
        Errors encountered during migration are likely unrecoverable by this tool.

        the addon-migrator can do this for you via

        migrate-addon reset

        aliased as both:
          ea2 reset
          ember-addon-migrator reset
    
    -----------------------------------\n
    `);
      error(e);
    }

    // eslint-disable-next-line no-process-exit, n/no-process-exit
    process.exit(1);
  }
}

/**
 * @param {import('./analysis/types').Options} options
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
        (options.testAppName.includes('@') &&
          options.testAppName.startsWith('@')) ||
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
