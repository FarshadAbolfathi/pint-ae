import type { BuildResult } from '@pint-ae/ae';
import type { Document, ValidationReport } from '@pint-ae/core';

/** Side effects the CLI needs, injected so `run` stays pure and testable. */
export interface Deps {
  readFile(path: string): string;
  writeFile(path: string, data: string): void;
  stdout(s: string): void;
  stderr(s: string): void;
  validateXml(xml: string): ValidationReport;
  buildFromJson(json: unknown): BuildResult<Document>;
  toXml(doc: Document): string;
  formatReport(report: ValidationReport): string;
}

const HELP = `pint-ae — UAE PINT AE e-invoice CLI

Usage:
  pint-ae validate <file.xml> [--json]
  pint-ae build <file.json> [--json] [-o <out.xml>]
  pint-ae help | version

Exit codes:
  0  success / valid document
  1  invalid document
  2  usage or I/O error
`;

/** Pull a flag's value (e.g. `-o out.xml`) out of the argument list. */
function takeOption(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const value = args[i + 1];
  args.splice(i, value === undefined ? 1 : 2);
  return value;
}

function hasFlag(args: string[], name: string): boolean {
  const i = args.indexOf(name);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
}

function reportOutput(report: ValidationReport, asJson: boolean, deps: Deps): void {
  deps.stdout(
    asJson ? `${JSON.stringify(report.toJSON(), null, 2)}\n` : `${deps.formatReport(report)}\n`,
  );
}

function cmdValidate(args: string[], deps: Deps): number {
  const asJson = hasFlag(args, '--json');
  const file = args[0];
  if (file === undefined) {
    deps.stderr(`Missing <file.xml>.\n\n${HELP}`);
    return 2;
  }
  let xml: string;
  try {
    xml = deps.readFile(file);
  } catch (err) {
    deps.stderr(`Cannot read ${file}: ${(err as Error).message}\n`);
    return 2;
  }
  const report = deps.validateXml(xml);
  reportOutput(report, asJson, deps);
  return report.valid ? 0 : 1;
}

function cmdBuild(args: string[], deps: Deps): number {
  const asJson = hasFlag(args, '--json');
  const outFile = takeOption(args, '-o');
  const file = args[0];
  if (file === undefined) {
    deps.stderr(`Missing <file.json>.\n\n${HELP}`);
    return 2;
  }
  let json: unknown;
  try {
    json = JSON.parse(deps.readFile(file));
  } catch (err) {
    deps.stderr(`Cannot read/parse ${file}: ${(err as Error).message}\n`);
    return 2;
  }

  const result = deps.buildFromJson(json);
  if (!result.ok || result.document === null) {
    deps.stderr(`Document is invalid:\n${deps.formatReport(result.report)}\n`);
    return 1;
  }

  const xml = deps.toXml(result.document);
  if (outFile !== undefined) {
    try {
      deps.writeFile(outFile, xml);
    } catch (err) {
      deps.stderr(`Cannot write ${outFile}: ${(err as Error).message}\n`);
      return 2;
    }
    deps.stdout(`Wrote ${outFile}\n`);
  } else if (asJson) {
    deps.stdout(`${JSON.stringify(result.document, null, 2)}\n`);
  } else {
    deps.stdout(`${xml}\n`);
  }
  return 0;
}

/** Run the CLI with the given arguments and return a process exit code. */
export function run(argv: string[], deps: Deps): number {
  const args = [...argv];
  const command = args.shift();
  switch (command) {
    case 'validate':
      return cmdValidate(args, deps);
    case 'build':
      return cmdBuild(args, deps);
    case 'version':
    case '--version':
    case '-v':
      deps.stdout('pint-ae (development build)\n');
      return 0;
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      deps.stdout(HELP);
      return 0;
    default:
      deps.stderr(`Unknown command: ${command}\n\n${HELP}`);
      return 2;
  }
}
