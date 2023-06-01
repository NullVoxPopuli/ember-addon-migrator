/**
 * @typedef {import('./analysis/index').AddonInfo} Info
 */
import { execaCommand } from 'execa';
import fse from 'fs-extra';
import fs from 'node:fs/promises';
import path from 'node:path';

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
  let ts = info.isTS ? '--typescript' : '';

  // we'll create the addon here instead of using a directory based on the actual name, as this is temporary anyway
  // and prevents issues with scoped package names getting in some way dasherized by ember-cli
  let addonDir = 'addon';

  await execaCommand(
    `npx ember-cli@^4.10.0 addon ${info.name}` +
      ` --dir=${addonDir}` +
      ` --blueprint @embroider/addon-blueprint` +
      (info.noMonorepo
        ? ` --addon-only`
        : ` --test-app-location=${info.testAppLocation}` +
          ` --test-app-name=${info.testAppName}` +
          ` --addon-location=${info.addonLocation}`) +
      ` ${packager}` +
      ` ${ts}` +
      // Installation will only happen as needed, and with the correct package manager
      ` --skip-npm` +
      // We want to use the existing git
      ` --skip-git`,
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
