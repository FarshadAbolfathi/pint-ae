#!/usr/bin/env node
/**
 * Copy the compiled SEF files into the ae package's `dist` so the published
 * build can load them at runtime (tsup bundles the code into dist/index.js, and
 * the Node SEF loader resolves `./generated/*.sef.json` relative to it).
 */
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'packages/ae/src/schematron/generated');
const dest = resolve(root, 'packages/ae/dist/generated');

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
process.stdout.write(`Copied SEF files to ${dest}\n`);
