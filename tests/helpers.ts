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

async function createTmpDir(prefix: string) {
  let prefixPath = path.join(os.tmpdir(), prefix);

  let tmpDirPath = await fs.mkdtemp(prefixPath);

  return tmpDirPath;
}

export async function addonFrom(fixture: string): Promise<Project> {
  let fixturePath = path.join(fixturesDir, fixture);
  let tmp = await createTmpDir(fixture);
  let originalPackageJsonPath = path.join(fixturePath, 'package.json');
  let originalPackageJson = await fse.readJSON(originalPackageJsonPath);

  let projectName = originalPackageJson.name;

  await fse.copy(fixturePath, tmp, { recursive: true });

  let project = {
    rootPath: tmp,
    addonPath: path.join(tmp, projectName),
    testAppPath: path.join(tmp, 'test-app'),
  }

  await execa('git', ['init'], { cwd: tmp });
  await execa('pnpm', ['install'], { cwd: tmp });

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
