import { execa } from 'execa';
import fse from 'fs-extra';
import { beforeAll, describe, expect, test } from 'vitest';

import { assertEmberTest, extractTests } from './assertions.js';
import {
  type Project,
  addonFrom,
  build,
  findFixtures,
  lintTestApp,
} from './helpers.js';

let fixtures = await findFixtures();

describe('extract-tests: fixtures', () => {
  for (let fixtureName of fixtures) {
    describe(fixtureName, () => {
      let project: Project;

      beforeAll(async () => {
        project = await addonFrom(fixtureName);
        await extractTests(project, ['--in-place']);
        await build(project);
      });

      test.concurrent('verify tmp project', async () => {
        await execa('ls', ['-la'], { cwd: project.rootPath, stdio: 'inherit' });

        expect(await fse.pathExists(project.rootPath), 'rootPath').toBe(true);
        expect(await fse.pathExists(project.addonPath), 'addonPath').toBe(true);
        expect(await fse.pathExists(project.testAppPath), 'testAppPath').toBe(
          true
        );
      });

      test.concurrent('lint test-app', async () => {
        let result = await lintTestApp(project);

        expect(result).toMatchObject({ exitCode: 0 });
      });

      test.concurrent('tests pass', async () => {
        await assertEmberTest(project);
      });
    });
  }
});
