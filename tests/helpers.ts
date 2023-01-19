/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'node:fs/promises';
import os from 'node:os';
import path, { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { execa } from 'execa';
import fse from 'fs-extra';

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

export const binPath = join(__dirname, '..', 'bin.js');

export async function adoptFixture(srcLocation: string): Promise<void> {
  let packageJsonPath = path.join(srcLocation, 'package.json');
  let packageJson = await fse.readJSON(packageJsonPath);
  let name = packageJson.name;
  let destinationPath = path.join(fixturesDir, name);

  await fs.cp(srcLocation, destinationPath, { recursive: true });
}

export async function findFixtures(): Promise<string[]> {
  return (await fs.readdir(fixturesDir, { withFileTypes: true }))
    .filter((stat) => stat.isDirectory())
    .map((stat) => stat.name);
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

  await fs.cp(fixturePath, tmp, { recursive: true });

  let project = {
    rootPath: tmp,
    addonPath: path.join(tmp, projectName),
    testAppPath: path.join(tmp, 'test-app'),
  };

  await execa('git', ['init'], { cwd: tmp });
  await execa('pnpm', ['install'], { cwd: tmp });

  return project;
}

export async function install(project: Project) {
  await execa('pnpm', ['install'], {
    cwd: project.rootPath,
  });
}

export async function build(project: Project) {
  let buildResult = await execa('pnpm', ['build'], { cwd: project.addonPath });

  return buildResult;
}

export async function emberTest(project: Project) {
  return await execa('pnpm', ['ember', 'test'], {
    cwd: project.testAppPath,
  });
}

export async function lintAddon(project: Project) {
  return await execa('pnpm', ['lint'], { cwd: project.addonPath });
}

export async function lintTestApp(project: Project) {
  return await execa('pnpm', ['lint'], { cwd: project.testAppPath });
}
