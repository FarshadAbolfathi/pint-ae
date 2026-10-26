/**
 * SEF loader for Node. Reads the compiled SEF files that sit next to the built
 * module (`./generated/*.sef.json` in both the `src` tree used by tests and the
 * `dist` tree used at runtime). Browser hosts (the playground) supply their own
 * loader that fetches the SEF assets instead.
 */
import type { SefLoader } from './validate.js';

export const nodeSefLoader: SefLoader = async (name) => {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const url = new URL(`./generated/${name}.sef.json`, import.meta.url);
  return readFile(fileURLToPath(url), 'utf8');
};
