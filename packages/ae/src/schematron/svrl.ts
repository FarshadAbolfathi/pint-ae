/** Parse Schematron SVRL output into the SDK's structured message shape. */
import type { Severity, ValidationMessage } from '@pint-ae/core';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

interface SvrlAssert {
  '@_id'?: string;
  '@_flag'?: string;
  '@_role'?: string;
  '@_location'?: string;
  text?: unknown;
}

function asArray<T>(value: unknown): T[] {
  if (value === undefined || value === null) return [];
  return (Array.isArray(value) ? value : [value]) as T[];
}

function textOf(node: unknown): string {
  if (node === undefined || node === null) return '';
  if (typeof node === 'string') return node.trim();
  const t = (node as { '#text'?: unknown })['#text'];
  return t === undefined ? '' : String(t).trim();
}

/** Map a Schematron `flag`/`role` to a severity. Defaults to `fallback`. */
function severityOf(assert: SvrlAssert, fallback: Severity): Severity {
  const flag = (assert['@_flag'] ?? assert['@_role'] ?? '').toLowerCase();
  if (flag === 'warning' || flag === 'warn' || flag === 'info') return 'warning';
  if (flag === 'fatal' || flag === 'error') return 'fatal';
  return fallback;
}

function toMessage(assert: SvrlAssert, fallback: Severity): ValidationMessage {
  return {
    ruleId: assert['@_id'] ?? 'unknown',
    severity: severityOf(assert, fallback),
    path: assert['@_location'] ?? '',
    message: textOf(assert.text),
  };
}

/**
 * Parse an SVRL document into validation messages. `failed-assert` elements are
 * assertion failures (fatal unless flagged otherwise); `successful-report`
 * elements are reports that fired (warning unless flagged otherwise).
 */
export function parseSvrl(svrl: string): ValidationMessage[] {
  const parsed = parser.parse(svrl) as Record<string, unknown>;
  const output = (parsed['schematron-output'] ?? parsed) as Record<string, unknown>;
  const failures = asArray<SvrlAssert>(output['failed-assert']).map((a) => toMessage(a, 'fatal'));
  const reports = asArray<SvrlAssert>(output['successful-report']).map((a) =>
    toMessage(a, 'warning'),
  );
  return [...failures, ...reports];
}
