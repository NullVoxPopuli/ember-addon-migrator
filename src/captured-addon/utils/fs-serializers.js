import * as path from 'path';
import * as fs from 'fs';
import pkg from 'lodash';

const { set, merge, get } = pkg;

/**
 *
 * @param {string | Record<string, any>} obj
 *
 * @returns {string | Record<string, any>}
 */
export function flattenFsProject(obj = '') {
  if (typeof obj === 'string') {
    return obj;
  }

  /** @type {Record<string, any>} */
  const result = {};

  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === 'string') {
      result[`${key}`] = obj[key];
    } else if (typeof obj[key] === 'object') {
      Object.keys(obj[key]).forEach((subKey) => {
        result[`${key}/${subKey}`] = flattenFsProject(obj[key][subKey]);
      });
    }
  });

  const isAllNestedKeysConverted = Object.values(result).every(
    (value) => typeof value === 'string'
  );

  if (!isAllNestedKeysConverted) {
    return flattenFsProject(result);
  }

  return result;
}

/**
 *
 * @param {string} projectRoot
 *
 * @returns {Record<string, string>}
 */
export function fsProjectToObject(projectRoot) {
  const folder = fs.readdirSync(projectRoot, {
    withFileTypes: true,
  });
  /** @type {Record<string, any>} */
  const result = {};
  const ignoredFileExtensions = [
    'gif',
    'jpg',
    'svg',
    'jpeg',
    'png',
    'woff',
    'ttf',
    'woff2',
    'woff',
    'gitkeep',
  ];
  const ignoredDirs = ['.git', 'node_modules', 'dist', 'tmp'];

  folder.forEach((file) => {
    const fsPath = path.join(projectRoot, file.name);

    if (file.isDirectory()) {
      if (ignoredDirs.includes(file.name)) {
        return;
      }

      result[file.name] = fsProjectToObject(fsPath);
    } else if (file.isFile() && !(file.name === 'project.json')) {
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === undefined) {
        return;
      }

      if (ignoredFileExtensions.includes(ext)) {
        return;
      }

      result[file.name] = fs.readFileSync(fsPath, 'utf8');
    }
  });

  return result;
}

/**
 *
 * @param {Record<string, any>} files
 *
 */
export function normalizeToFs(files) {
  /** @type {Record<string, any>} */
  const newShape = {};

  Object.keys(files).forEach((key) => {
    const parts = key.split('/');
    const isRef = typeof files[key] !== 'string';
    const value = isRef ? normalizeToFs(files[key]) : files[key];
    const isFilePath = parts[parts.length - 1].includes('.');

    if (isFilePath) {
      const fileName = parts.pop();

      if (!fileName) {
        return;
      }

      if (parts.length) {
        /** @type {Record<string, any>} */
        const valueToMerge = {
          [fileName]: value,
        };

        if (parts[0].startsWith('.')) {
          parts[0] = parts[0].replace('.', '__');
        }

        const valuePath = parts.join('.');

        const existingValueOnPath = get(newShape, valuePath, {});

        set(newShape, valuePath, merge(existingValueOnPath, valueToMerge));
      } else {
        newShape[fileName] = value;
      }
    } else {
      let entry = newShape;

      parts.forEach((p, index) => {
        const isLast = index === parts.length - 1;

        if (index === 0 && p.startsWith('.')) {
          p = p.replace('.', '__');
        }

        if (!(p in entry)) {
          entry[p] = {};
        }

        if (isLast) {
          merge(entry[p], value);
        } else {
          entry = entry[p];
        }
      });
    }
  });

  // lodash merge fix for paths, with dots
  Object.keys(newShape).forEach((key) => {
    if (key.startsWith('__')) {
      newShape[key.replace('__', '.')] = newShape[key];
      delete newShape[key];
    }
  });

  return newShape;
}
