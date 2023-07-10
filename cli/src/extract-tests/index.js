import { packageJson } from 'ember-apply';
import fs from 'fs-extra';
import Listr from 'listr';
import path from 'node:path';
import url from 'node:url';
import util from 'node:util';

import { moveAddon } from '../addon.js';
import { AddonInfo } from '../analysis/index.js';
import { resolvedDirectory } from '../analysis/paths.js';
import { runEmber } from '../ember.js';
import { error, info } from '../log.js';
import { fixReferences } from '../references.js';
import { migrateTestApp } from '../test-app.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

// Known testing-related possible dependencies
const testingDependencies = [
  'ember-qunit',
  '@types/ember-qunit',
  '@ember/test-helpers',
  '@types/ember__test-helpers',
  'qunit',
  '@types/qunit',
  'qunit-dom',
  'ember-try',
  'sinon',
  'ember-sinon-qunit',
  'ember-a11y-testing',
  'ember-cli-page-object',
  'ember-cli-code-coverage',
  'ember-test-selectors',
];

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
            task: () => moveAddon(analysis, { globs: ['!tests'] }),
          });

          tasks.push({
            title: `Fix references for new addon location: ${analysis.addonLocation}`,
            task: () => fixReferences(analysis),
          });
        }

        tasks.push({
          title: `Creating new app (named: ${analysis.testAppName}) for tests in: ${analysis.testAppLocation}`,
          task: async (ctx, task) => {
            await createTestApp(analysis, task, args);
          },
        });

        tasks.push({
          title: `Moving files from the addon to the test-app`,
          task: () => migrateTestApp(analysis, args),
        });

        tasks.push({
          title: `Cleaning up unused artifacts from addon`,
          task: () => cleanupAddon(analysis),
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
 * We need to generate this in a tmp directory, and then move files back to where we want them to live.
 * This is in part due to ember-cli's aggressive protections around not deleting files (good),
 * but we can work around it.
 *
 * @param {AddonInfo} analysis
 * @param {import('../types.js').TestAppOptions} options
 */
async function createTestApp(analysis, task, options) {
  task.output = '';

  await runEmber(
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

  let testApp = path.join(analysis.directory, analysis.testAppLocation);

  /**
   * Because this is an addon, we want to add `@embroider/test-setup`
   * and configure the ember-cli-build to optionally use embroider
   */
  task.output = 'Converting "ember new" app to addon-test app...';
  await packageJson.addDevDependencies(
    {
      'ember-source-channel-url': '^3.0.0',
      '@embroider/test-setup': '^2.1.1',
    },
    testApp
  );

  if (!options.skipEmberTry) {
    await packageJson.addDevDependencies(
      {
        'ember-try': '^2.0.0',
      },
      testApp
    );
  }

  let replacementECBuild = path.join(
    __dirname,
    '../override-files/test-app/ember-cli-build.js'
  );

  await fs.copy(replacementECBuild, path.join(testApp, 'ember-cli-build.js'));

  if (!options.skipEmberTry) {
    let emberTry = path.join(
      __dirname,
      '../override-files/test-app/ember-try.js'
    );

    await fs.copy(emberTry, path.join(testApp, 'config/ember-try.js'));
  }

  // there is no --ci-provider=none?
  await fs.rm(path.join(testApp, '.github'), { recursive: true, force: true });
}

/**
 * @param {AddonInfo} analysis
 */
async function cleanupAddon(analysis) {
  // These were recently moved to the app!
  await fs.rm(path.join(analysis.addonLocation, 'tests'), {
    force: true,
    recursive: true,
  });
  // Lockfile doesn't go here
  await fs.rm(path.join(analysis.addonLocation, 'yarn.lock'), {
    force: true,
    recursive: true,
  });
  await fs.rm(path.join(analysis.addonLocation, 'package-lock.json'), {
    force: true,
    recursive: true,
  });
  await fs.rm(path.join(analysis.addonLocation, 'pnpm-lock.yaml'), {
    force: true,
    recursive: true,
  });

  await packageJson.modify((json) => {
    // Remove any test-related scripts, as they now will be in the test-app
    json.scripts = Object.fromEntries(
      Object.entries(json.scripts).filter(([key]) => !key.includes('test'))
    );

    // Remove testing dependencies from devDependencies, unless they are in peerDependencies, which means the addon's own code (e.g. /addon-test-support) might need them
    json.devDependencies = Object.fromEntries(
      Object.entries(json.devDependencies).filter(
        ([key]) =>
          !testingDependencies.includes(key) ||
          json.peerDependencies?.[key] !== undefined
      )
    );
  }, analysis.addonLocation);
}
