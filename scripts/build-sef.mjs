#!/usr/bin/env node
/**
 * Compile the official PINT AE Schematron XSLT 2.0 stylesheets (vendored under
 * `spec/`) into SaxonJS SEF files, using the free `xslt3` XX compiler.
 *
 * The SEF files are generated artifacts — never hand-edit them. Regenerate with:
 *   node scripts/build-sef.mjs
 *
 * CI runs this and fails if the committed SEF files differ from a fresh build,
 * guaranteeing they always match the vendored specification.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
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

mkdirSync(outDir, { recursive: true });

for (const { out, xsl } of targets) {
  const source = resolve(specDir, xsl);
  const dest = resolve(outDir, `${out}.sef.json`);
  process.stdout.write(`Compiling ${xsl} -> ${out}.sef.json\n`);
  execFileSync(xslt3, [`-xsl:${source}`, `-export:${dest}`, '-nogo'], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}

process.stdout.write(`Done. ${targets.length} SEF files written to ${outDir}\n`);
