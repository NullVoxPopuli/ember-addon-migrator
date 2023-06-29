/**
 * @typedef {import('./analysis/index').AddonInfo} Info
 * @typedef {import('./types').TestAppOptions} TestAppOptions
 */
import { html, js, packageJson } from 'ember-apply';
import fs from 'fs/promises';
import fse from 'fs-extra';
import { globby } from 'globby';
import latestVersion from 'latest-version';
import path from 'path';

/**
 * @param {Info} info
 * @param {TestAppOptions} options
 */
export async function migrateTestApp(info, options) {
  await moveTestsAndDummyApp(info, options);
  await fixDummyAppReferences(info);
  // TODO: update in-test imports to use the test-app name instead of "dummy"

  if (options.reuseExistingConfigs) {
    await moveFilesToTestApp(info);
  }

  await updateFilesWithinTestApp(info, options);
  await removeFiles(info);
}

/**
 * @param {Info} info
 */
async function moveFilesToTestApp(info) {
  let { testAppLocation } = info;

  // Move useful files to test app, which have no use for the addon anymore
  let toMove = ['ember-cli-build.js', 'config/ember-try.js', 'testem.js'];

  // Copy other config files that we can reuse for the addon and the test-app
  let toCopy = [
    '.template-lintrc.js',
    '.prettierrc.js',
    '.prettierignore',
    '.eslintrc.js',
    '.stylelintrc.js',
    '.stylelintignore',
    'tailwind.config.js',
  ];

  await Promise.allSettled([
    ...toMove.map((filePath) =>
      fse.move(
        path.join(info.addonLocation, filePath),
        path.join(testAppLocation, filePath),
        { overwrite: true }
      )
    ),
    ...toCopy.map((filePath) =>
      fse.copy(
        path.join(info.addonLocation, filePath),
        path.join(testAppLocation, filePath),
        { overwrite: true }
      )
    ),
  ]);
}

/**
 * @param {Info} info
 * @param {TestAppOptions} options
 */
async function updateFilesWithinTestApp(info, options) {
  let { testAppLocation, testAppName } = info;

  // ember-cli-build: EmberAddon => EmberApp
  // ember-cli-build: 'ember-addon' => 'ember-app'
  await replaceIn(
    `${testAppLocation}/ember-cli-build.js`,
    'EmberAddon',
    'EmberApp'
  );
  await replaceIn(
    `${testAppLocation}/ember-cli-build.js`,
    '/ember-addon',
    '/ember-app'
  );
  await replaceIn(
    `${testAppLocation}/tests/test-helper.{js,ts}`,
    'dummy/app',
    `${testAppName}/app`
  );
  await replaceIn(
    `${testAppLocation}/tests/test-helper.{js,ts}`,
    'dummy/config',
    `${testAppName}/config`
  );
  await replaceIn(
    `${testAppLocation}/app/app.{js,ts}`,
    'dummy/config',
    `${testAppName}/config`
  );

  if (options.reuseExistingVersions || options.ignoreNewDependencies) {
    // Reuse existing versions specifiers (e.g. when having pinned versions), optionally remove new dependencies
    let newPkg = await packageJson.read(testAppLocation);

    if (newPkg.dependencies) {
      /** @type Record<string, string> */
      let dependenciesToFix = {};
      let dependenciesToRemove = [];

      for (let [depName, newVersion] of Object.entries(newPkg.dependencies)) {
        let existingVersion = info.versionForDependency(depName);

        if (
          options.reuseExistingVersions &&
          existingVersion &&
          existingVersion !== newVersion
        ) {
          dependenciesToFix[depName] = existingVersion;
        } else if (options.ignoreNewDependencies && !existingVersion) {
          dependenciesToRemove.push(depName);
        }
      }

      if (Object.keys(dependenciesToFix).length > 0) {
        await packageJson.addDependencies(dependenciesToFix, testAppLocation);
      }

      if (dependenciesToRemove.length) {
        await packageJson.removeDependencies(
          dependenciesToRemove,
          testAppLocation
        );
      }
    }

    if (newPkg.devDependencies) {
      /** @type Record<string, string> */
      let devDependenciesToFix = {};
      let devDependenciesToRemove = [];

      for (let [depName, newVersion] of Object.entries(
        newPkg.devDependencies
      )) {
        let existingVersion = info.versionForDependency(depName);

        if (
          options.reuseExistingVersions &&
          existingVersion &&
          existingVersion !== newVersion
        ) {
          devDependenciesToFix[depName] = existingVersion;
        } else if (options.ignoreNewDependencies && !existingVersion) {
          devDependenciesToRemove.push(depName);
        }
      }

      if (Object.keys(devDependenciesToFix).length > 0) {
        await packageJson.addDevDependencies(
          devDependenciesToFix,
          testAppLocation
        );
      }

      if (devDependenciesToRemove.length) {
        await packageJson.removeDevDependencies(
          devDependenciesToRemove,
          testAppLocation
        );
      }
    }
  }

  await packageJson.removeDevDependencies([info.name], testAppLocation);

  if (info.packageManager === 'pnpm') {
    await packageJson.addDependencies(
      { [info.name]: 'workspace:*' },
      testAppLocation
    );
  } else {
    await packageJson.addDependencies({ [info.name]: '*' }, testAppLocation);
  }

  await packageJson.addDevDependencies(
    {
      '@embroider/test-setup': await latestVersion('@embroider/test-setup'),
    },
    testAppLocation
  );

  await packageJson.removeDevDependencies(
    ['ember-welcome-page'],
    testAppLocation
  );
  await fse.remove(path.join(testAppLocation, 'app/templates/application.hbs'));

  let current = await packageJson.read(testAppLocation);

  /** @type Record<string, string> */
  let toAdd = {};

  if (info.packageJson.devDependencies && current.devDependencies) {
    let devDeps = info.packageJson.devDependencies;
    let newDevDeps = Object.keys(current.devDependencies);

    for (let [depName, range] of Object.entries(devDeps)) {
      if (newDevDeps.includes(depName)) continue;

      toAdd[depName] = range;
    }
  }

  if (Object.keys(toAdd).length > 0) {
    await packageJson.addDevDependencies(toAdd, testAppLocation);
  }
}

/**
 * @param {Info} info
 * @param {TestAppOptions} options
 */
async function moveTestsAndDummyApp(info, options) {
  const dummyAppPaths = await globby(['**/*'], {
    cwd: path.join(info.tmpLocation, 'tests/dummy/'),
  });

  for (let filePath of dummyAppPaths) {
    if (!filePath.startsWith('config') || options.reuseExistingConfigs) {
      await fse.move(
        path.join(info.tmpLocation, 'tests/dummy/', filePath),
        path.join(info.testAppLocation, filePath),
        { overwrite: true }
      );
    }
  }

  await fse.move(
    path.join(info.tmpLocation, 'tests/index.html'),
    path.join(info.testAppLocation, 'tests/index.html'),
    { overwrite: true }
  );
  await fse.remove(path.join(info.tmpLocation, 'tests/dummy'));

  const paths = await globby([path.join(info.tmpLocation, 'tests/**/*')]);

  for (let filePath of paths) {
    let localFile = filePath.replace(info.tmpLocation, '');

    await fse.move(filePath, path.join(info.testAppLocation, localFile), {
      overwrite: true,
    });
  }

  await fse.remove(path.join(info.testAppLocation, 'tests', 'dummy'));
}

/**
 * @param {Info} info
 */
async function fixDummyAppReferences(info) {
  // fix `{ modulePrefix: 'dummy' }` in environment.js
  await js.transform(
    path.join(info.testAppLocation, 'config', 'environment.js'),
    async ({ j, root }) => {
      root.find(j.ObjectExpression).forEach((path) => {
        for (const prop of path.node.properties) {
          if (
            prop.key.name === 'modulePrefix' &&
            prop.value.value === 'dummy'
          ) {
            prop.value.value = info.testAppName;
          }
        }
      });
    }
  );

  // fix `import ... from 'dummy/...' in .{js,ts} files
  const dummyAppJsFiles = await globby([
    `${info.testAppLocation}/**/*.{js,ts}`,
  ]);

  for (const fileToTransform of dummyAppJsFiles) {
    await js.transform(fileToTransform, async ({ j, root }) => {
      root
        .find(j.ImportDeclaration, {
          source: { value: (value) => value.startsWith('dummy') },
        })
        .forEach((path) => {
          path.node.source.value = path.node.source.value.replace(
            /^dummy/,
            info.testAppName
          );
        });
    });
  }

  // fix <script> and <link> in index.html
  const dummyHtmlFiles = await globby([
    `${info.testAppLocation}/**/index.html`,
  ]);

  for (const htmlFile of dummyHtmlFiles) {
    await html.transform(htmlFile, (tree) => {
      tree.match({ tag: 'script' }, (node) => {
        if (node.attrs) {
          node.attrs.src = node.attrs.src?.replace(
            'assets/dummy.js',
            `assets/${info.testAppName}.js`
          );
        }

        return node;
      });

      tree.match({ tag: 'link' }, (node) => {
        if (node.attrs) {
          node.attrs.href = node.attrs.href?.replace(
            'assets/dummy.css',
            `assets/${info.testAppName}.css`
          );
        }

        return node;
      });
    });
  }
}

/**
 * Before this runs, we need to make sure we move all
 * necessary files (as this deletes all top-level js)
 *
 * @param {Info} info
 */
async function removeFiles(info) {
  let unneededPaths = [
    'app',
    'vendor',
    'tests',
    'config',
    '.watchmanconfig',
    '.ember-cli',
    'types',
    'tsconfig.json',
    '.npmignore',
    '.eslintignore',
    'tests/dummy',
    'tests/index.html',
  ];

  let hasEmberData =
    info.hasDependency('ember-data') || info.hasDevDependency('ember-data');

  if (!hasEmberData) {
    unneededPaths.push('types/ember-data');
  }

  let topLevelJs = await globby('*.js');

  await Promise.allSettled([
    ...unneededPaths.map((filePath) => fse.remove(filePath)),
    ...topLevelJs.map((filePath) => fse.remove(filePath)),
  ]);
}

/**
 * @param {string} glob
 * @param {string} toFind
 * @param {string} replaceWith
 */
async function replaceIn(glob, toFind, replaceWith) {
  let filePaths = await globby(glob);

  for (let filePath of filePaths) {
    let buffer = await fs.readFile(filePath);
    let asString = buffer.toString();
    let replaced = asString.replaceAll(toFind, replaceWith);

    await fs.writeFile(filePath, replaced);
  }
}
