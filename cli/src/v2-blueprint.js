/**
 * @typedef {import('./analysis/index').AddonInfo} Info
 */
import fse from 'fs-extra';
import fs from 'node:fs/promises';
import path from 'node:path';

import { runEmber } from './ember.js';
import { createTmp } from './prepare.js';

/**
 * @param {Info} info
 */
export async function installV2Blueprint(info) {
  let tmp = await createTmp('v2-addon-creation--');
  let packager = info.isPnpm
    ? '--pnpm'
    : info.isYarn
    ? '--yarn'
    : info.isNpm
    ? '--npm'
    : '';
  let ts = info.isTS ? '--typescript' : undefined;

  // we'll create the addon here instead of using a directory based on the actual name, as this is temporary anyway
  // and prevents issues with scoped package names getting in some way dasherized by ember-cli
  let addonDir = 'addon';

  await runEmber(
    [
      'addon',
      info.name,
      `--dir=${addonDir}`,
      // needs https://github.com/embroider-build/addon-blueprint/pull/137 for proper TS support
      '--blueprint=embroider-build/addon-blueprint#update-for-upstream-ts-changes',
      `--test-app-location=${info.testAppLocation}`,
      `--test-app-name=${info.testAppName}`,
      `--addon-location=${info.addonLocation}`,
      packager,
      ts,
      // Installation will only happen as needed, and with the correct package manager
      '--skip-npm',
      // We want to use the existing git
      '--skip-git',
    ].filter(Boolean),
    {
      cwd: tmp,
    }
  );

  let generatedLocation = path.join(tmp, addonDir);
  let generatedFiles = await fs.readdir(generatedLocation);

  for (let current of generatedFiles) {
    let absolutePath = path.join(generatedLocation, current);

    await fse.move(absolutePath, path.join(info.directory, current), {
      overwrite: true,
    });
  }
}
