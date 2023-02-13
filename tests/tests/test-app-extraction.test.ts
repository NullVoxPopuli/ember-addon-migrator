import { execa } from 'execa';
import fse from 'fs-extra';
import path from 'node:path';
import { beforeAll, describe, expect, test } from 'vitest';

import { assertEmberTest, extractTests } from '../assertions.js';
import {
  type Project,
  addonFrom,
  findFixtures,
  install,
  lintTestApp,
} from '../helpers.js';

let fixtures = await findFixtures();

describe('extract-tests: fixtures', () => {
  for (let fixtureName of fixtures) {
    describe(fixtureName, () => {
      let project: Project;

      beforeAll(async () => {
        project = await addonFrom(fixtureName);
        await extractTests(project, ['--in-place']);
        // For tests, since we aren't in a monorepo,
        // make the rootDir a monorepo
        // "extra-tests" does not create monorepos
        await fse.writeFile(
          path.join(project.rootPath, 'package.json'),
          JSON.stringify({ name: 'root', private: true, version: '0.0.0' })
        );
        await fse.writeFile(
          path.join(project.rootPath, 'pnpm-workspace.yaml'),
          `packages:\n` + `- package\n` + `- test-app\n`
        );

        await install(project);
      });

      test.concurrent('verify tmp project', async () => {
        await execa('ls', ['-la'], { cwd: project.rootPath, stdio: 'inherit' });

        expect(
          await fse.pathExists(project.rootPath),
          `rootPath: ${project.rootPath}`
        ).toBe(true);
        expect(
          await fse.pathExists(project.addonPath),
          `addonPath: ${project.addonPath}`
        ).toBe(false);
        expect(
          await fse.pathExists(project.packagePath),
          `packagePath: ${project.packagePath}`
        ).toBe(true);
        expect(
          await fse.pathExists(project.testAppPath),
          `testAppPath: ${project.testAppPath}`
        ).toBe(true);
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
