import { execa } from 'execa';

/**
 *
 * @param {import('./analysis/index').AddonInfo} analysis
 * @param {string} location
 */
export async function lintFix(analysis, location) {
  let packageManager = analysis.packageManager;

  if (packageManager === 'npm') {
    return await execa('npm', ['run', 'lint:fix'], { cwd: location });
  }

  return await execa(packageManager, ['lint:fix'], { cwd: location });
}
