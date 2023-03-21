import fse from 'fs-extra';
import Listr from 'listr';
import util from 'node:util';

import { AddonInfo, analyze } from './analysis/index.js';
import { resolvedDirectory } from './analysis/paths.js';
import { moveAddon } from './extract-tests/index.js';
import { error, info } from './log.js';

/**
 * @param {{ directory: string, analysisOnly: boolean }} args
 */
export async function convertToMonorepo(args) {
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
        let tasks = [
          {
            title: `Moving addon to sub-folder: ${analysis.addonLocation}`,
            task: async () => {
              await moveAddon(analysis);
            },
          },
          {
            title: `Creating root files`,
            skip: () => args.analysisOnly,
            task: async () => {
              await createRootFiles(analysis);
            },
          },
        ];

        return new Listr(tasks);
      },
    },
  ]);

  try {
    await tasks.run();

    info(
      `You'll probably need to manually update .github / C.I. configurations`
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
  }
}

async function createRootFiles(analysis) {
  let packageManager = analysis.packageManager;

  let packageJson = {
    name: `root`,
    version: '0.0.0',
    private: true,
    license: analysis.packageJson.license,
    repository: analysis.packageJson.repository,
  };

  if (analysis.packageJson.volta) {
    packageJson.volta = analysis.packageJson.volta;
  }

  if (analysis.packageJson.packageManager) {
    packageJson.packageManager = analysis.packageJson.packageManager;
  }

  if (analysis.packageJson.resolutions) {
    packageJson.resolutions = analysis.packageJson.resolutions;
  }

  if (analysis.packageJson.pnpm) {
    packageJson.pnpm = analysis.packageJson.pnpm;
  }

  switch (packageManager) {
    case 'npm': {
      return writeNpmFiles(packageJson, analysis);
    }
    case 'yarn': {
      return writeYarnFiles(packageJson, analysis);
    }
    case 'pnpm': {
      return writePnpmFiles(packageJson, analysis);
    }

    default:
      throw new Error(`Unsupported package manager: ${packageManager}`);
  }
}

async function writeNpmFiles(packageJson, analysis) {
  await fse.writeFile(
    'package.json',
    JSON.stringify({
      ...packageJson,
      workspaces: [analysis.addonLocation],
    })
  );
}

async function writeYarnFiles(packageJson, analysis) {
  await fse.writeFile(
    'package.json',
    JSON.stringify({
      ...packageJson,
      workspaces: [analysis.addonLocation],
    })
  );
}

async function writePnpmFiles(packageJson, analysis) {
  await fse.writeFile(
    'package.json',
    JSON.stringify({
      ...packageJson,
    })
  );

  await fse.writeFile(
    'pnpm-workspace.yaml',
    `packages:\n` + `  - ${analysis.addonLocation}\n`
  );
}
