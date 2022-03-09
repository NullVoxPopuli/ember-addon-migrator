/* eslint-disable @typescript-eslint/no-explicit-any */
import { execa } from 'execa';
import fs from 'fs';
import fse from 'fs-extra';
import { dirname, join } from 'path';
import { Project } from 'scenario-tester';
import semver from 'semver';
import { fileURLToPath } from 'url';
import { expect } from 'vitest';

import { captureAddon, restoreAddon } from './../src/captured-addon/utils/fs-helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function sampleAddons() {
  const samplesDir = join(__dirname, 'samples');

  return fs
    .readdirSync(samplesDir)
    .filter((el) => fs.existsSync(join(samplesDir, el, 'input.json')));
}

/**
 * @description function created to workaround fixturify issue, where all mentioned in project package.json deps should exists in node_modules
 */
function addFakeDependency(nodeModulesPath: string, name: string, version: string) {
  try {
    fse.outputFileSync(
      join(nodeModulesPath, name, 'package.json'),
      JSON.stringify({
        name,
        version,
      })
    );
  } catch (e) {
    // FINE
  }
}

export async function addonFrom(fixture: string, skipInstall = false): Promise<Project> {
  let packagePath = join(__dirname, 'fixtures', fixture, 'package.json');
  let sampleAddon: null | { path: string; destroy: () => Promise<void> } = null;

  if (!fs.existsSync(packagePath)) {
    let sample = join(__dirname, 'samples', fixture, 'input.json');

    if (!fs.existsSync(sample)) {
      throw new Error(`Unable to resolve fixture ${fixture}`);
    }

    let addonObject = fse.readJSONSync(sample);

    sampleAddon = await restoreAddon(addonObject);

    if (!sampleAddon) {
      throw new Error(`Unable to restore sample addon: ${fixture}`);
    }

    packagePath = join(sampleAddon.path, 'package.json');
  }

  let originalPackageJsonPath = require.resolve(packagePath);
  const nodeModulesPath = join(dirname(originalPackageJsonPath), 'node_modules');

  if (skipInstall) {
    await fse.mkdirp(nodeModulesPath);

    const pkg: Record<string, Record<string, string>> = fse.readJSONSync(packagePath);

    Object.keys(pkg).forEach((key) => {
      if (key.toLocaleLowerCase().includes('dependencies')) {
        Object.keys(pkg[key]).forEach((depName) => {
          addFakeDependency(nodeModulesPath, depName, pkg[key][depName]);
        });
      }
    });
  }

  // This TS is compiled to CJS, so require is fine
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let originalPackageJson = require(originalPackageJsonPath);
  let fixturePath = dirname(originalPackageJsonPath);

  if (!skipInstall) {
    // all node_modules need to exist due to bug in fixturify
    // project where it assumes that node_modules exists
    await install({ baseDir: fixturePath });
  }

  let project = Project.fromDir(fixturePath);

  project.name = originalPackageJson.name;

  project.writeSync();

  if (!skipInstall) {
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
  } else {
    try {
      // we need this to not resolve ember-cli from addon itself (all deps is mocked)
      fse.rmSync(join(project.baseDir, 'node_modules', 'ember-cli'), { recursive: true });
    } catch (e) {
      // FINE
    }
  }

  return project;
}

export const binPath = join(__dirname, '..', 'bin.js');

export async function migrate(project: Pick<Project, 'baseDir'>) {
  let { stdout } = await execa('node', [binPath], { cwd: project.baseDir });

  expect(stdout).toMatch(`🎉 Congratulations! Your addon is now formatted as a V2 addon!`);
}

export async function install(project: Pick<Project, 'baseDir'>) {
  let { stdout } = await execa('yarn', ['install'], {
    cwd: project.baseDir,
    preferLocal: true,
  });

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

export async function fastVerify(fixtureName: string) {
  let project = await addonFrom(fixtureName, true);

  await migrate(project);

  const result = await captureAddon(project.baseDir);

  console.debug(`fastVerify: ${project.baseDir}`);

  const fixturePath = join(__dirname, 'samples', fixtureName);
  const outputPath = join(fixturePath, 'output.json');

  if (fs.existsSync(outputPath)) {
    const expectedResult = fse.readJSONSync(outputPath);

    Object.keys(result).forEach((fPath) => {
      if (fPath.endsWith('package.json')) {
        const data = JSON.parse(result[fPath]);
        const expectedData = JSON.parse(expectedResult[fPath]);

        expect(`${fPath} keys: ${Object.keys(data).sort().join(',')}`).toEqual(
          `${fPath} keys: ${Object.keys(expectedData).sort().join(',')}`
        );

        Object.keys(data).forEach((key) => {
          if (key.toLocaleLowerCase().includes('dependencies')) {
            const deps = Object.keys(data[key]);

            deps.forEach((dep) => {
              const prefix = `${fPath} ${key}[${dep}]`;
              const meta = `${prefix} is ok: `;
              const expectedResult = [meta, true.toString()].join(' ');

              expect(`${prefix} is ${typeof expectedData[key][dep]}`).toBe(`${prefix} is string`);

              if (expectedData[key][dep] === '*' && typeof data[key][dep]) {
                return;
              }

              const cleanedExpectedResult = semver.coerce(expectedData[key][dep]);
              const cleanResult = semver.coerce(data[key][dep]);

              expect(`${expectedData[key][dep]} -> ${dep} expected version`).include(
                String(cleanedExpectedResult?.version)
              );
              expect(`${data[key][dep]} -> ${dep} migrated version`).include(
                String(cleanResult?.version)
              );

              const cleanExpectedResult = cleanedExpectedResult?.major;
              const isOk = semver.satisfies(
                cleanResult as semver.SemVer,
                `${cleanExpectedResult?.toString()}.x`
              );
              const currentResult = [meta, isOk.toString()].join(' ');

              expect(currentResult).toEqual(expectedResult);
            });
          } else {
            expect(`${fPath} : ${JSON.stringify(data[key])}`).toEqual(
              `${fPath} : ${JSON.stringify(expectedData[key])}`
            );
          }
        });
      } else {
        const lines = (result[fPath] || '').split(/\r?\n/);
        const expectedLines = (expectedResult[fPath] || '').split(/\r?\n/);

        lines.forEach((line, index) => {
          let expected = expectedLines[index] || '';
          let actual = line || '';

          // TODO: how do we handle package.json and version differences?
          expect(`${fPath}@${index}: ${actual}`).toEqual(`${fPath}@${index}: ${expected}`);
        });
      }
    });
  } else {
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    expect(Object.keys(result).length).toBeGreaterThan(0);
  }
}
