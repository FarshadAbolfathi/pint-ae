/**
 * `pint-ae` command line tool.
 *
 *   pint-ae validate <file.xml> [--json]
 *   pint-ae build <file.json> [--json] [-o <out.xml>]
 *
 * Exit codes: 0 = success/valid, 1 = invalid document, 2 = usage/IO error.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { buildFromJson, formatReport, PintAE } from '@pint-ae/ae';
import { run } from './run.js';

process.exit(
  run(process.argv.slice(2), {
    readFile: (p) => readFileSync(p, 'utf8'),
    writeFile: (p, data) => writeFileSync(p, data),
    stdout: (s) => process.stdout.write(s),
    stderr: (s) => process.stderr.write(s),
    validateXml: (xml) => PintAE.validate(xml),
    buildFromJson,
    toXml: (doc) => PintAE.toXml(doc),
    formatReport,
  }),
);
