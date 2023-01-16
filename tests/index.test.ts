import { expect, describe, test, beforeAll } from 'vitest';

import { findFixtures, addonFrom, migrate, emberTest, type Project, lintAddon, lintTestApp, build } from './helpers.js';

let fixtures = await findFixtures();

describe('fixtures', () => {
  for (let fixtureName of fixtures) {
    describe(fixtureName, () => {
      let project: Project;

      beforeAll(async () => {
        project = await addonFrom(fixtureName);

      });

      test('migrate & build', async () => {
        await migrate(project);
        await build(project);
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

