import { error } from '../log.js';

export class NothingToDoError extends Error {}
export class AnalysisError extends Error {}

/**
 * @template Return
 * @param {() => Promise<Return>} fn
 * @param {string} msg
 *
 * @returns {Promise<Return>}
 *
 */
export async function tryOrFail(fn, msg) {
  try {
    return await fn();
  } catch (/** @type {any} */ e) {
    error(e);
    throw new AnalysisError(msg);
  }
}
