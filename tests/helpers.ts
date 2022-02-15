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

  // This TS is compiled to CJS, so require is fine
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let originalPackageJson = require(originalPackageJsonPath);
  let fixturePath = dirname(originalPackageJsonPath);

  // all node_modules need to exist due to bug in fixturify
  // project where it assumes that node_modules exists
  await install({ baseDir: fixturePath });

  let project = Project.fromDir(fixturePath);

  project.name = originalPackageJson.name;

  project.writeSync();

  await install(project);
  await execa('git', ['init'], { cwd: project.baseDir });
  await execa('git', ['add', '.'], { cwd: project.baseDir });
  await execa(
    'git',
    [
      '-c',
      "user.name='test-user'",
      '-c',
      "user.email='test@email.org'",
      'commit',
      '-m',
      '"initial commit"',
    ],
    { cwd: project.baseDir }
  );

  return project;
}

export const binPath = join(__dirname, '..', 'bin.js');

export async function migrate(project: Pick<Project, 'baseDir'>) {
  let { stdout } = await execa('node', [binPath], { cwd: project.baseDir });

  expect(stdout).toMatch(`🎉 Congratulations! Your addon is now formatted as a V2 addon!`);
}

export async function install(project: Pick<Project, 'baseDir'>) {
  let { stdout } = await execa('yarn', ['install'], { cwd: project.baseDir, preferLocal: true });

  // yarn-specific in-progress message
  expect(stdout).toMatch('Resolving packages...');
}

export async function build(project: Pick<Project, 'baseDir' | 'name'>) {
  let addonPath = join(project.baseDir, project.name);
  let { stdout, exitCode } = await execa('yarn', ['run', 'build'], { cwd: addonPath });

  // subset of full stdout
  // can't use snapshot testing due to time taken printed
  // to stdout
  console.debug(stdout);
  expect(exitCode).toEqual(0);
  expect(stdout).toMatch(`$ concurrently 'npm:build:*'`);
  expect(stdout).toMatch('[build:*js] > rollup -c ./rollup.config.js');
  expect(stdout).toMatch('[build:*docs] > cp ../README.md ./README.md');
  // Message from concurrently
  expect(stdout).toMatch('npm run build:js exited with code 0');

  let result = await execa('ls', { cwd: join(project.baseDir, project.name) });

  expect(result.stdout).toMatch('dist');
}

export async function emberTest(project: Pick<Project, 'baseDir'>) {
  let { stdout, exitCode } = await execa('yarn', ['run', 'ember', 'test'], {
    cwd: join(project.baseDir, 'test-app'),
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

export async function verify(fixtureName: string) {
  let project = await addonFrom(fixtureName);

  await migrate(project);
  await install(project);
  await build(project);
  await emberTest(project);
}
