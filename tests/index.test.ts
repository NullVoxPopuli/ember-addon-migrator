import fse from 'fs-extra';
import { beforeAll,describe, expect, test } from 'vitest';

import { type Project, addonFrom, build,emberTest, findFixtures, lintAddon, lintTestApp, migrate } from './helpers.js';

let fixtures = await findFixtures();

describe('fixtures', () => {
  for (let fixtureName of fixtures) {
    describe(fixtureName, () => {
      let project: Project;

      beforeAll(async () => {
        project = await addonFrom(fixtureName);
      });

      test('verify tmp project', async () => {
        expect(await fse.pathExists(project.rootPath), 'rootPath').toBe(true); 
        expect(await fse.pathExists(project.addonPath), 'addonPath').toBe(true); 
        expect(await fse.pathExists(project.testAppPath), 'testAppPath').toBe(true); 
      });

      test('migrate & build', async () => {
        await migrate(project);
        await build(project);

        // Yay! no errors!
        expect(true).toBe(true);
      });

      test.concurrent('lint addon', async () => {
        let result = await lintAddon(project)

        expect(result).toMatchObject({ exitCode: 0 });
      });

      test.concurrent('lint test-app', async () => {
        let result = await lintTestApp(project);

        expect(result).toMatchObject({ exitCode: 0 });
      });

      test.concurrent('tests pass', async () => {
        let result = await emberTest(project);

        expect(result).toMatchObject({ exitCode: 0 });
      });
    }) 
  }
})

