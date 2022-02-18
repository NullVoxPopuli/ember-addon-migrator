import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import admZip from 'adm-zip';
import { createTempDir } from 'broccoli-test-helper';
import { captureAddon } from './utils/fs-helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function downloadAddon(addonPath = '') {
  if (!addonPath.endsWith('.zip')) {
    // assume link looks like https://github.com/NullVoxPopuli/ember-addon-migrator
    if (addonPath.endsWith('/')) {
      addonPath = addonPath.slice(0, -1);
    }

    addonPath = `${addonPath}/archive/refs/heads/master.zip`;
  }

  console.info(`Downloading: ${addonPath}`);

  const request = await fetch(addonPath);
  const result = await request.arrayBuffer();

  const archive = new admZip(Buffer.from(result));
  const dir = await createTempDir();

  archive.extractAllTo(dir.path());

  const [dirName] = fs.readdirSync(dir.path());

  const dirEntry = path.join(dir.path(), dirName);

  console.info(`Addon extracted to: ${dirEntry}`);

  return dirEntry;
}

async function capture(addonPath = '', addonName = '', addonVersion = '') {
  if (addonPath.startsWith('http')) {
    addonPath = await downloadAddon(addonPath);
  }

  const info = fs.readJSONSync(path.join(addonPath, 'package.json'));

  if (addonName === '') {
    addonName = info.name;
  }

  if (addonVersion === '') {
    addonVersion = info.version;
  }

  const data = captureAddon(addonPath);
  const samplesFolder = path.join(__dirname, './../../tests/samples');
  const snapshotName = 'input.json';

  fs.outputFileSync(
    path.join(samplesFolder, `${addonName}_${addonVersion}`, snapshotName),
    JSON.stringify(data, null, 2)
  );
}

// capture('https://github.com/adfinis-sygroup/ember-validated-form');

// capture(
//   '/Users/aleksandr_kanunnikov/Documents/repos/ember-addon-output',
//   'ember-addon-output',
//   '4.2.0'
// );

// capture(process.cwd());
