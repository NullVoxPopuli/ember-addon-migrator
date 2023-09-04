import { execa } from 'execa';
import fse from 'fs-extra';
import assert from 'node:assert';
import { beforeAll, describe, expect, test } from 'vitest';

import { assertEmberTest, makeMonorepo } from '../assertions.js';
import { type Project, addonFrom, findFixtures, install } from '../helpers.js';

let fixtures = await findFixtures();

let fixtureName = fixtures.find((name) => !name.includes('-ts'));

describe(`make-monorepo on fixture: ${fixtureName}`, () => {
  let project: Project;

  beforeAll(async () => {
    assert(fixtureName, 'No fixtures found');

    project = await addonFrom(fixtureName);
    await makeMonorepo(project.rootPath);
    await install(project.rootPath);
  });

  test('verify tmp project', async () => {
    console.debug(`verify tmp project 'ls -la' @ ${project.rootPath}`);

    await execa('ls', ['-la'], { cwd: project.rootPath, stdio: 'inherit' });

    expect(
      await fse.pathExists(project.rootPath),
      `rootPath: ${project.rootPath}`
    ).toBe(true);
    expect(
      await fse.pathExists(project.addonPath),
      `addonPath: ${project.addonPath}`
    ).toBe(true);
    expect(
      await fse.pathExists(project.packagePath),
      `packagePath: ${project.packagePath}`
    ).toBe(false);
    expect(
      await fse.pathExists(project.testAppPath),
      `testAppPath: ${project.testAppPath}`
    ).toBe(false);
  });

  test('tests pass', async () => {
    assertEmberTest(project.addonPath);
  });
});
