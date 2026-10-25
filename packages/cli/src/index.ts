/**
 * `pint-ae` command line tool.
 *
 * Milestone 1 ships only the scaffold; the real commands
 * (`pint-ae validate <file>`, `pint-ae build <json>`) arrive in Milestone 3.
 * See the roadmap in the repository README.
 */

const HELP = `pint-ae — UAE PINT AE e-invoice CLI

Usage:
  pint-ae <command>

Commands (planned for Milestone 3):
  validate <file>   Validate a UBL XML invoice against the PINT AE rules
  build <json>      Build a UBL XML invoice from a JSON description

This is a Milestone 1 scaffold; commands are not implemented yet.
`;

function main(argv: string[]): number {
  const [command] = argv;
  switch (command) {
    case 'version':
    case '--version':
    case '-v':
      // Version is injected at build time by the package manager in M3.
      process.stdout.write('pint-ae (development build)\n');
      return 0;
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      process.stdout.write(HELP);
      return 0;
    default:
      process.stderr.write(`Unknown command: ${command}\n\n${HELP}`);
      return 2;
  }
}

process.exit(main(process.argv.slice(2)));
