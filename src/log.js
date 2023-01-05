import chalk from 'chalk';
import { stripIndent } from 'common-tags';

/**
 * @param {string | Error} msg
 */
export function error(msg) {
  if (typeof msg !== 'string') {
    if (msg instanceof Error) {
      msg = msg.message;
    }
  }

  console.error(chalk.red(stripIndent(msg)));
}

/**
 * @param {string} msg
 */
export function info(msg) {
  console.info(stripIndent(msg));
}
