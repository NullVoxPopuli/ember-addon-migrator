import { execa } from 'execa';
import { expect } from 'vitest';

import { type Project, binPath, emberTest } from './helpers.js';

export async function migrate(project: Pick<Project, 'rootPath'>) {
  console.debug('To Debug:');
  console.debug(`  within: ${project.rootPath}`);
  console.debug(`node ${binPath}`);

  let { stdout } = await execa('node', [binPath], { cwd: project.rootPath });

  expect(stdout).toMatch(
    `🎉 Congratulations! Your addon is now formatted as a V2 addon!`
  );
}

export async function makeMonorepo(
  project: Pick<Project, 'rootPath'>,
  flags: Array<string> = []
) {
  console.debug('To Debug:');
  console.debug(`  within: ${project.rootPath}`);
  console.debug(`node ${binPath} make-monorepo ${flags.join(' ')}`);

  let { stdout } = await execa('node', [binPath, 'make-monorepo', ...flags], {
    cwd: project.rootPath,
  });

  expect(stdout).toMatch(
    `ℹ️  You'll probably need to manually update .github / C.I. configurations`
  );
}

export async function extractTests(
  project: Pick<Project, 'rootPath'>,
  flags: Array<'--in-place' | string> = []
) {
  console.debug('To Debug:');
  console.debug(`  within: ${project.rootPath}`);
  console.debug(`node ${binPath} extract-tests ${flags.join(' ')}`);

  let { stdout } = await execa('node', [binPath, 'extract-tests', ...flags], {
    cwd: project.rootPath,
  });

  expect(stdout).toMatch(
    `🎉 Congratulations! Your tests have been extracted to their own app!`
  );
}

export async function assertEmberTest(project: Pick<Project, 'testAppPath'>) {
  let { stdout, exitCode } = await emberTest(project);

  // subset of full stdout
  // can't use snapshot testing due to time taken printed
  // to stdout
  console.debug(stdout);
  expect(exitCode).toEqual(0);
  expect(stdout).toMatch('Built project successfully');
  expect(stdout).toMatch('# skip  0');
  expect(stdout).toMatch('# todo  0');
  expect(stdout).toMatch('# fail  0');
}
