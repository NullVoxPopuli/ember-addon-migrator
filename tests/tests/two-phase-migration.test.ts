import { execa } from 'execa';
import fse from 'fs-extra';
import { beforeAll, describe, expect, test } from 'vitest';

import { assertEmberTest, extractTests, migrate } from '../assertions.js';
import {
  type Project,
  addonFrom,
  build,
  findFixtures,
  install,
  lintAddon,
  lintTestApp,
  makeMonorepo,
} from '../helpers.js';

let fixtures = await findFixtures();

for (let fixtureName of fixtures) {
  describe(`extract-tests + --exclude-tests on fixture: ${fixtureName}`, () => {
    let project: Project;

    beforeAll(async () => {
      project = await addonFrom(fixtureName);
      await extractTests(project.rootPath, ['--no-in-place']);
      await makeMonorepo(project.rootPath);
      await install(project.rootPath);
      await migrate(project.packagePath, ['--exclude-tests']);
      await install(project.rootPath);
      await build(project.packagePath);
    });

    test('verify tmp project', async () => {
      console.debug(`verify tmp project 'ls -la' @ ${project.rootPath}`);

      await execa('ls', ['-la'], { cwd: project.rootPath, stdio: 'inherit' });

      expect(
        await fse.pathExists(project.rootPath),
        `rootPath: ${project.rootPath}`
      ).toBe(true);
      expect(
        await fse.pathExists(project.packagePath),
        `addonPath: ${project.packagePath}`
      ).toBe(true);
      expect(
        await fse.pathExists(project.testAppPath),
        `testAppPath: ${project.testAppPath}`
      ).toBe(true);
    });

    test('lint addon', async () => {
      let result = await lintAddon(project.packagePath);

      expect(result).toMatchObject({ exitCode: 0 });
    });

    test('lint test-app', async () => {
      let result = await lintTestApp(project.testAppPath);

      expect(result).toMatchObject({ exitCode: 0 });
    });

    test('tests pass', async () => {
      await assertEmberTest(project.testAppPath);
    });
  });
}
