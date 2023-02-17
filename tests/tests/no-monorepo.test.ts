import { execa } from 'execa';
import fse from 'fs-extra';
import { beforeAll, describe, expect, test } from 'vitest';

import { assertEmberTest, migrate } from '../assertions.js';
import {
  type Project,
  addonFrom,
  build,
  findFixtures,
  lintAddon,
} from '../helpers.js';

let fixtures = await findFixtures();

for (let fixtureName of fixtures) {
  describe(`no-monorepo option on fixture: ${fixtureName}`, () => {
    let project: Project;
    let oldProject: Project;

    beforeAll(async () => {
      project = await addonFrom(fixtureName);
      oldProject = { ...project };
      project.addonPath = project.rootPath;
      project.testAppPath = project.rootPath;
      project.packagePath = project.rootPath;
      await migrate(project, ['--no-monorepo']);
      await build(project);
    });

    test.concurrent('verify tmp project', async () => {
      await execa('ls', ['-la'], { cwd: project.rootPath, stdio: 'inherit' });

      expect(
        await fse.pathExists(project.rootPath),
        `rootPath: ${project.rootPath}`
      ).toBe(true);
      expect(
        await fse.pathExists(oldProject.packagePath),
        `packagePath: ${oldProject.addonPath}`
      ).toBe(false);
      expect(
        await fse.pathExists(oldProject.addonPath),
        `addonPath: ${oldProject.addonPath}`
      ).toBe(false);
      expect(
        await fse.pathExists(oldProject.testAppPath),
        `testAppPath: ${oldProject.testAppPath}`
      ).toBe(false);
    });

    test.concurrent('lint', async () => {
      let result = await lintAddon(project);

      expect(result).toMatchObject({ exitCode: 0 });
    });

    test.concurrent('tests pass', async () => {
      await assertEmberTest(project);
    });
  });
}
