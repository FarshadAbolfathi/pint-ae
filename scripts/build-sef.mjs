#!/usr/bin/env node
/**
 * Compile the official PINT AE Schematron XSLT 2.0 stylesheets (vendored under
 * `spec/`) into SaxonJS SEF files, using the free `xslt3` XX compiler.
 *
 * The SEF files are generated artifacts — never hand-edit them. Regenerate with:
 *   node scripts/build-sef.mjs
 * Verify the committed SEF match the vendored spec (ignoring the compiler's
 * build timestamp and integrity hash, which are not reproducible):
 *   node scripts/build-sef.mjs --check
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const specDir = resolve(root, 'spec/pint-ae-billing');
const outDir = resolve(root, 'packages/ae/src/schematron/generated');
const xslt3 = resolve(root, 'node_modules/.bin/xslt3');

/** Each output SEF and the Schematron XSLT it is compiled from. */
const targets = [
  { out: 'invoice-core', xsl: 'trn-invoice/schematron/PINT-UBL-validation-preprocessed.xslt' },
  { out: 'invoice-aligned', xsl: 'trn-invoice/schematron/PINT-jurisdiction-aligned-rules.xslt' },
  {
    out: 'creditnote-core',
    xsl: 'trn-creditnote/schematron/PINT-UBL-validation-preprocessed.xslt',
  },
  {
    out: 'creditnote-aligned',
    xsl: 'trn-creditnote/schematron/PINT-jurisdiction-aligned-rules.xslt',
  },
];

/** Drop the non-reproducible build timestamp and integrity hash for comparison. */
function normalize(sef) {
  return sef
    .replace(/"buildDateTime":"[^"]*"/, '"buildDateTime":""')
    .replace(/"Σ":"[^"]*"/, '"Σ":""');
}

function compile(outPath, xsl) {
  execFileSync(xslt3, [`-xsl:${resolve(specDir, xsl)}`, `-export:${outPath}`, '-nogo'], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}

const check = process.argv.includes('--check');

if (check) {
  const tmp = resolve(outDir, '.check.tmp.sef.json');
  let stale = false;
  for (const { out, xsl } of targets) {
    compile(tmp, xsl);
    const fresh = normalize(readFileSync(tmp, 'utf8'));
    const committed = normalize(readFileSync(resolve(outDir, `${out}.sef.json`), 'utf8'));
    if (fresh !== committed) {
      process.stderr.write(`SEF out of date: ${out}.sef.json\n`);
      stale = true;
    }
  }
  rmSync(tmp, { force: true });
  if (stale) {
    process.stderr.write('Run: node scripts/build-sef.mjs\n');
    process.exit(1);
  }
  process.stdout.write('SEF files are up to date.\n');
} else {
  mkdirSync(outDir, { recursive: true });
  for (const { out, xsl } of targets) {
    process.stdout.write(`Compiling ${xsl} -> ${out}.sef.json\n`);
    compile(resolve(outDir, `${out}.sef.json`), xsl);
  }
  process.stdout.write(`Done. ${targets.length} SEF files written to ${outDir}\n`);
}
