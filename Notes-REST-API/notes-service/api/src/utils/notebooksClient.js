import { env } from '../config/env.js';

/**
 * Checks whether a notebook with the given ID exists in the notebooks-service.
 *
 * @param {string} notebookId - The notebook ID to verify.
 * @returns {Promise<boolean>} true if notebook exists, false if 404.
 * @throws {Error} for any non-404 failure (network error, 5xx, timeout).
 */
export const checkNotebookExists = async (notebookId) => {
  const url = `${env.NOTEBOOKS_SERVICE_URL}/api/v1/notebooks/${notebookId}`;

  const response = await fetch(url, {
    method: 'GET',
    signal: AbortSignal.timeout(3000),
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.ok) {
    return true;
  }

  if (response.status === 404) {
    return false;
  }

  throw new Error(`Unexpected response from notebooks-service: ${response.status}`);
};
