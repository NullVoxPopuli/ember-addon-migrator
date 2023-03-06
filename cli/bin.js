#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import extractTests from './src/extract-tests/index.js';
import reset from './src/git-reset.js';
import run from './src/index.js';
import { info } from './src/log.js';
import { isSolorepo } from './src/workspaces.js';

let yarg = yargs(hideBin(process.argv));

yarg.wrap(yarg.terminalWidth());

yarg
  .command(
    'reset',
    'resets the git workspace -- useful in case of error and you need to re-run' +
      ' the migrator. Each step is not idempotent, so resetting continuing after' +
      ' an error is not always possible. This runs `git clean -f -d; git checkout .',
    () => {},
    async () => {
      info(`Resetting git repo to clean state...`);

      await reset();

      info('Done! ✨');
    }
  )
  .command(
    'extract-tests',
    `in low-maintenance projects, or projects with many people needing context, ` +
      `it is greatly beneficial to do a v2 addon conversion in two parts: ` +
      `split the tests from the addon, and then later in a separate PR, ` +
      `do the actual v1 -> v2 conversion of the addon itself. ` +
      `extract-tests is meant to be a partial migration -- as such, it does not generate C.I.-passable code after running, as it cannot know exactly how your repo and C.I. are configured. ` +
      `Please check lints and C.I. config after running.`,
    (yargs) => {
      yargs.option('test-app-location', {
        describe:
          'The folder to place the extracted test app. ' +
          'Defaults to a sibling folder to the addon-location named "test-app"',
        type: 'string',
      });
      yargs.option('directory', {
        describe:
          'the directory to run the migration in. defaults to the current directory',
        type: 'string',
        default: process.cwd(),
      });
      yargs.option('in-place', {
        describe:
          'within the current directory, move the v1 addon out of the way and in to a sub-folder that will be sibling to the test-app',
        type: 'boolean',
      });
      yargs.option('addon-location', {
        describe: `This flag is only relevant when in-place is present. This is the location that the addon will be moved to. To match the addon-blueprint, set this to the addon's name.`,
        type: 'string',
        default: 'package',
      });
      yargs.option('test-app-name', {
        describe: 'the name of the test-app package.',
        type: 'string',
        default: 'test-app',
      });
      yargs.option('analysis-only', {
        describe: 'inspect the analysis object, skipping migration entirely',
        type: 'boolean',
        default: false,
      });
    },
    async (args) => {
      // "Light logic" to keep the test app to be a sibling to the addon directory (if not specified)
      let testAppLocation =
        args.testAppLocation || (args.inPlace ? 'test-app' : '../test-app');

      if (!args.inPlace && (await isSolorepo(args.directory))) {
        args.inPlace = true;
      }

      return extractTests({ ...args, testAppLocation });
    }
  )
  .command(
    ['run', '$0 [addon-location]'],
    'the default command -- runs the addon migrator.',
    (yargs) => {
      yargs.option('addon-location', {
        describe:
          'the folder to place the addon package. defaults to the package name.',
        type: 'string',
      });
      yargs.option('test-app-location', {
        describe: 'the folder to place the test-app package.',
        type: 'string',
        default: 'test-app',
      });
      yargs.option('test-app-name', {
        describe: 'the name of the test-app package.',
        type: 'string',
        default: 'test-app',
      });
      yargs.option('directory', {
        describe:
          'the directory to run the migration in. defaults to the current directory',
        type: 'string',
        default: process.cwd(),
      });
      yargs.option('analysis-only', {
        describe: 'inspect the analysis object, skipping migration entirely',
        type: 'boolean',
        default: false,
      });
    },
    (args) => {
      return run(args);
    }
  )
  .help().argv;
