/**
 *
 * @typedef {import('../index').Info} Info
 */
import path from 'path';
import { files } from 'ember-apply';

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {Info} info
 */
export async function setupJs(info) {
  let { workspace } = info;

  let jsFiles = path.join(__dirname, 'files');

  await files.applyFolder(jsFiles, workspace);
}
