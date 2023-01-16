/* eslint-disable @typescript-eslint/no-explicit-any */
import os from 'node:os';
import fs from 'node:fs/promises';
import path, { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { execa } from 'execa';
import fse from 'fs-extra';
import { expect } from 'vitest';

export interface Project {
  rootPath: string;
  addonPath: string;
  testAppPath: string;
}

/**
  * NOTE: these tests *only* use pnpm, becausue npm and yarn are frail 
  *       and slow.
  */

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures');
const binPath = join(__dirname, '..', 'bin.js');

export async function findFixtures(): Promise<string[]> {
  return (await fs.readdir(fixturesDir, { withFileTypes: true }))
    .filter(stat => stat.isDirectory())
    .map(stat => stat.name);
}

async function createTmpDir(prefix) {
  let prefixPath = path.join(os.tmpdir(), prefix);

  let tmpDirPath = await fs.mkdtemp(prefixPath);

  return tmpDirPath;
}

export async function addonFrom(fixture: string): Promise<Project> {
  let packagePath = join(__dirname, 'fixtures', fixture, 'package.json');

  let originalPackageJsonPath = require.resolve(packagePath);

  // This TS is compiled to CJS, so require is fine
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let originalPackageJson = require(originalPackageJsonPath);
  let fixturePath = dirname(originalPackageJsonPath);

  let project = Project.fromDir(fixturePath);

  project.name = originalPackageJson.name;

  await project.write();

    try {
      // we need this to not resolve ember-cli from addon itself (all deps is mocked)
      fse.rmSync(join(project.baseDir, 'node_modules', 'ember-cli'), { recursive: true });
    } catch (e) {
      // FINE
    }

  return project;
}


export async function migrate(project: Project) {
  let { stdout } = await execa('node', [binPath], { cwd: project.rootPath });

  expect(stdout).toMatch(`🎉 Congratulations! Your addon is now formatted as a V2 addon!`);
}

export async function install(project: Project) {
  await execa('pnpm', ['install'], {
    cwd: project.rootPath,
  });
}

export async function build(project: Project) {
  let { stdout, exitCode } = await execa('pnpm', ['build'], { cwd: project.addonPath });

  // subset of full stdout
  // can't use snapshot testing due to time taken printed
  // to stdout
  console.debug(stdout);
  expect(exitCode).toEqual(0);

  let result = await execa('ls', { cwd: project.addonPath });

  expect(result.stdout).toMatch('dist');
}

export async function emberTest(project: Project) {
  let { stdout, exitCode } = await execa('pnpm', ['run', 'ember', 'test'], {
    cwd: project.testAppPath,
  });

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

export async function lintAddon(project: Project) {
  return await execa('pnpm', ['lint'], { cwd: project.addonPath });
}

export async function lintTestApp(project: Project) {
  return await execa('pnpm', ['lint'], { cwd: project.testAppPath });
}

export async function verify(fixtureName: string) {
  let project = await addonFrom(fixtureName);

  await migrate(project);
  await install(project);
  await build(project);
  await emberTest(project);
}
