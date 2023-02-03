import { execa } from 'execa';
import fs from 'fs-extra';
import { globby } from 'globby';
import Listr from 'listr';
import util from 'node:util';

import { AddonInfo } from '../analysis/index.js';
import { resolvedDirectory } from '../analysis/paths.js';
import { error, info } from '../log.js';

/**
 * @param {import('./types.js').Args} args
 */
export default async function extractTests(args) {
  let targetAddon = resolvedDirectory(args.directory);

  process.chdir(targetAddon);

  /** @type {AddonInfo} */
  let analysis;

  let tasks = new Listr([
    {
      title: `Analyzing the addon`,
      task: async () => {
        analysis = await analyze(args);
      },
    },
    {
      title: 'Running migrator',
      skip: () => args.analysisOnly,
      task: () => {
        let tasks = [];

        if (args.inPlace) {
          tasks.push({
            title: `Moving addon to sub-folder: ${analysis.addonLocation}`,
            task: () => moveAddon(analysis),
          });
        }

        tasks.push({
          title: `Creating new app (named: ${analysis.testAppName}) for tests in: ${analysis.testAppLocation}`,
          task: async (ctx, task) => {
            if (analysis.isTS) {
              task.output =
                '⚠️  Native typescript from ember-cli ignores --skip-npm.';
            }

            await createTestApp(analysis);
          },
        });

        tasks.push({
          title: `Moving files from the addon to the test-app`,
          task: () => {},
        });

        tasks.push({
          title: `Deleting remaining extraneous files from addon`,
          task: () => {},
        });

        return new Listr(tasks);
      },
    },
  ]);

  try {
    await tasks.run();

    if (args.analysisOnly) return;
    // @ts-ignore
    if (!analysis) return;

    info(
      `\n\n` +
        `🎉 Congratulations! Your tests have been extracted to their own app!\n` +
        `\n` +
        `Next steps:\n` +
        ` - ensure linting / formatting works how you like\n` +
        ` - ensure C.I. works, and runs the new test app\n` +
        ` - PR\n` +
        ` - party 🥳\n` +
        ` - prepare for the conversion of the addon to the V2 format\n`
    );
  } catch (/** @type{any} */ e) {
    if (process.env.DEBUG) {
      console.info('Detected options: ', util.inspect(args));
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

    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }
}

/**
 * @param {import('./types.js').Args} args
 * @returns {Promise<AddonInfo>}
 */
async function analyze(args) {
  let analysis = await AddonInfo.create(args);

  if (args.analysisOnly) {
    console.debug(util.inspect(analysis, { showHidden: true, getters: true }));

    // eslint-disable-next-line n/no-process-exit
    process.exit(0);
  }

  if (!analysis.isV1Addon) {
    throw new Error(`This operations is only allowed on v1 addons`);
  }

  return analysis;
}

/**
 * @param {AddonInfo} analysis
 */
async function moveAddon(analysis) {
  await fs.ensureDir(analysis.addonLocation);

  let paths = await globby(['*', '.*', '!.git', '!.github'], {
    expandDirectories: false,
  });

  for (let filePath of paths) {
    await fs.move(filePath, analysis.addonLocation);
  }
}

/**
 * @param {AddonInfo} analysis
 */
async function createTestApp(analysis) {
  /**
   * NOTE: using `--typescript` forces skip-npm to be ignored due to how the --typescript support is implemented in ember-cli
   */
  await execa(
    'ember',
    [
      'new',
      analysis.testAppName,
      '--skip-git',
      '--skip-npm',
      '--directory',
      analysis.testAppLocation,
      '--lang',
      'en-US',
      '--welcome',
      'false',
      ...(analysis.isTS ? ['--typescript'] : []),
    ],
    { cwd: analysis.directory }
  );

  /**
   * Because of the --typescript problem, let's delete node_modules and the generated lockfile.
   * they're likely wrong / broken anyway.
   */

  /**
   * Because this is an addon, we want to add `@embroider/test-setup`
   * and configure the ember-cli-build to optionally use embroider
   */
}
