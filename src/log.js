import chalk from 'chalk';
import { stripIndent } from 'common-tags';

/**
 * @param {string} msg
 */
export function error(msg) {
  console.error(chalk.red(stripIndent(msg)));
}

/**
 * @param {string} msg
 */
export function info(msg) {
  console.info(stripIndent(msg));
}
