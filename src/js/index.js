/**
 *
 * @typedef {import('../index').Info} Info
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { files } from 'ember-apply';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {Info} info
 */
export async function setupJs(info) {
  let { workspace } = info;

  let jsFiles = path.join(__dirname, 'files');

  await files.applyFolder(jsFiles, workspace);
}
