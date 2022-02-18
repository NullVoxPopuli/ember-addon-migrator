import * as path from 'path';
import { createTempDir } from 'broccoli-test-helper';
import { flattenFsProject, fsProjectToObject, normalizeToFs } from './fs-serializers.js';

async function initFileStructure(files = {}) {
  const dir = await createTempDir();

  dir.write(files);

  return {
    path: path.normalize(dir.path()),
    async destroy() {
      await dir.dispose();
    },
  };
}

/**
 *
 * @param {string} entryPoint
 *
 * @returns {Record<string, string>}
 */
export function captureAddon(entryPoint) {
  const obj = fsProjectToObject(entryPoint);

  const json = flattenFsProject(obj);

  if (typeof json === 'string') {
    return {};
  }

  return json;
}

/**
 *
 * @param {Record<string, string>} json
 *
 */
export function restoreAddon(json) {
  const fsObject = normalizeToFs(json);

  return initFileStructure(fsObject);
}
