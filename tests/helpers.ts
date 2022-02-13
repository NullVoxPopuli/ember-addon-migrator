/* eslint-disable @typescript-eslint/no-explicit-any */
import { execa } from 'execa';
import { dirname, join } from 'path';
import { Project } from 'scenario-tester';
import { fileURLToPath } from 'url';
import { expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function addonFrom(fixture: string): Promise<Project> {
  let originalPackageJsonPath = require.resolve(
    join(__dirname, 'fixtures', fixture, 'package.json')
  );
  let originalPackageJson = require(originalPackageJsonPath);
  let fixturePath = dirname(originalPackageJsonPath);
  let project = Project.fromDir(fixturePath);

  project.name = originalPackageJson.name;

  project.writeSync();

  await install(project);
  await execa('git', ['init'], { cwd: project.baseDir });
  await execa('git', ['add', '.'], { cwd: project.baseDir });
  await execa('git', ['commit', '-m', '"initial commit"'], { cwd: project.baseDir });

  return project;
}

export const binPath = join(__dirname, '..', 'bin.js');

export async function migrate(project: Project) {
  let { stdout } = await execa('node', [binPath], { cwd: project.baseDir });

  expect(stdout, 'running the migrator').toMatchSnapshot();
}

export async function install(project: Project) {
  let { stdout } = await execa('yarn', ['install'], { cwd: project.baseDir, preferLocal: true });

  expect(stdout, 'installing dependencies').toMatchSnapshot();
}

export async function build(project: Project) {
  let addonPath = join(project.baseDir, project.name);
  let { stdout } = await execa('yarn', ['run', 'build'], { cwd: addonPath });

  expect(stdout, 'building the addon').toMatchSnapshot();

  let result = await execa('ls', { cwd: join(project.baseDir, project.name) });

  expect(result.stdout).toMatch('dist');
}

export async function emberTest(project: Project) {
  let { stdout } = await execa('yarn', ['run', 'ember', 'test'], {
    cwd: join(project.baseDir, 'test-app'),
  });

  expect(stdout, 'running ember test').toMatchSnapshot();
}

export async function verify(fixtureName: string) {
  let project = await addonFrom(fixtureName);

  await migrate(project);
  await install(project);
  await build(project);
  await emberTest(project);
}
