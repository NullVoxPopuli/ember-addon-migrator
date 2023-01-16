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
  let packager = info.isPnpm ? '--pnpm' : info.isYarn ? '--yarn' : info.isNpm ? '--npm' : '';
  let ts = info.isTS ? '--typescript' : '';

  await execaCommand(
    `npx ember-cli@4.10.0-beta.0 addon ${info.name}` +
      ` --blueprint @embroider/addon-blueprint` +
      // ` --blueprint ../addon-blueprint` +
      ` --test-app-location=${info.testAppLocation}` +
      ` --test-app-name=${info.testAppName}` +
      ` --addon-location=${info.addonLocation}` +
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

  let generatedLocation = path.join(tmp, info.name);
  let generatedFiles = await fs.readdir(generatedLocation);

  for (let current of generatedFiles) {
    let absolutePath = path.join(generatedLocation, current);

    await fse.move(absolutePath, path.join(info.directory, current), { overwrite: true });
  }
}
