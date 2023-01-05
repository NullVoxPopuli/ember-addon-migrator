// @ts-check

import path from 'path';
import assert from 'assert';
import Listr from 'listr';

import { migrateAddon } from './addon.js';
import { prepare } from './prepare.js';
import { migrateTestApp } from './test-app.js';
import { updateRootFiles } from './workspaces.js';
import { error, info } from './log.js';
import { installV2Blueprint } from './v2-blueprint.js';
import { AddonInfo } from './analysis/index.js';
import { resolvedDirectory } from './analysis/paths.js';

/**
 * @param {import('./analysis/types').Options} options
 */
export default async function run(options) {
  await verifyOptions(options);

  /** @type {AddonInfo} */
  let analysis;

  try {
    let tasks = new Listr([
      {
        title: `Analyzing the addon`,
        task: async () => {
          analysis = await AddonInfo.create(options);
        },
      },
      {
        title: 'Running Migrator',
        task: () => {
          return new Listr([
            {
              title: `Copying addon to tmp directory, ${analysis.tmpLocation}`,
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
        },
      },
    ]);

    await tasks.run().then(() => {
      info(
        `\n` +
          `🎉 Congratulations! Your addon is now formatted as a V2 addon!\n` +
          `\n` +
          `Next steps:\n` +
          ` - customize the rollup.config.js to suit your needs\n` +
          ` - audit dependencies of both the new addon and test-app\n` +
          ` - run \`${analysis.packageManager} install\`\n` +
          ` - run \`${analysis.packageManager} ` +
          `${analysis.packageManager === 'npm' ? 'run ' : ''}lint:fix\` in each workspace\n` +
          ` - test your addon \`cd test-app; ${analysis.packageManager} test\`\n` +
          ` - push up a branch, merge, release\n` +
          ` - party 🥳\n`
      );
    });
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
