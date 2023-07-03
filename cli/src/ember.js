// @ts-expect-error
import emberCli from 'ember-cli';

/**
 *
 * @param {string[]} cliArgs
 * @param {{ cwd?: string}} options
 */
export async function runEmber(cliArgs, options = {}) {
  const originalCwd = process.cwd();

  if (options.cwd) {
    process.chdir(options.cwd);
  }

  // Enable pnpm support behind a flag
  process.env.EMBER_CLI_PNPM = 'true';

  // By importing ember-cli instead of spawning a new process via execa, we make sure that we run the blueprint with whatever version of ember-cli we depend on
  await emberCli({
    cliArgs,
    inputStream: process.stdin,
    outputStream: process.stdout,
    errorStream: process.stderr,
  });

  // Running Ember CLI this way seems to alter the current working directory
  process.chdir(originalCwd);
}
