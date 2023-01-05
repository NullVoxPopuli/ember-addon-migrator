/**
 * @typedef {import('./index').Info} Info
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execaCommand } from 'execa';
import fse from 'fs-extra';

import { createTmp } from './prepare.js';

/**
 * @param {Info} info
 */
export async function installV2Blueprint(info) {
  let tmp = await createTmp('v2-addon-creation--');

  await execaCommand(
    `ember addon ${info.packageName}` +
      ` --blueprint @embroider/addon-blueprint` +
      ` --test-app-location=${info.testAppLocation}` +
      ` --test-app-name=${info.testAppName}` +
      ` --addon-location=${info.addonLocation}` +
      ` --package-manager=${info.packager}` +
      // Installation will only happen as needed, and with the correct package manager
      ` --skip-npm` +
      // We want to use the existing git
      ` --skip-git`,
    {
      cwd: tmp,
    }
  );

  let generatedLocation = path.join(tmp, info.packageName);
  let generatedFiles = await fs.readdir(generatedLocation);

  for (let current of generatedFiles) {
    let absolutePath = path.join(generatedLocation, current);

    await fse.move(absolutePath, path.join(info.directory, current), { overwrite: true });
  }
}
