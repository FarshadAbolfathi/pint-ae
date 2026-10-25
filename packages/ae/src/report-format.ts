/** Human-readable formatting of a {@link ValidationReport} for CLI output. */
import type { ValidationReport } from '@pint-ae/core';

/** Render a validation report as a plain-text, human-readable summary. */
export function formatReport(report: ValidationReport): string {
  const lines: string[] = [];
  if (report.messages.length === 0) {
    lines.push('✓ Valid: no issues found.');
    return lines.join('\n');
  }

  for (const m of report.messages) {
    const mark = m.severity === 'fatal' ? '✗' : '!';
    lines.push(`${mark} [${m.ruleId}] ${m.path}\n    ${m.message}`);
  }
  const errorCount = report.errors.length;
  const warningCount = report.warnings.length;
  lines.push('');
  lines.push(
    report.valid
      ? `Valid with ${warningCount} warning(s).`
      : `Invalid: ${errorCount} error(s), ${warningCount} warning(s).`,
  );
  return lines.join('\n');
}
