import type { Severity, ValidationMessage } from './report.js';
import { ValidationReport } from './report.js';

/**
 * A single rule failure reported by a {@link Rule}. The rule contributes its
 * own id/severity; the failure contributes where and (optionally) a message
 * that overrides the rule's default assertion text.
 */
export interface RuleFailure {
  path: string;
  message?: string;
}

/**
 * A validation rule over a subject of type `T`.
 *
 * Rules are intentionally pure: `check` must not mutate the subject. Each rule
 * carries the official identifier and the assertion text copied verbatim from
 * the source Schematron so that reports are traceable to the specification.
 */
export interface Rule<T> {
  /** Official rule identifier, e.g. `ibr-co-10`. */
  readonly id: string;
  readonly severity: Severity;
  /** The official assertion text; used as the default message. */
  readonly text: string;
  /** Return the failures found, or an empty array when the rule passes. */
  check(subject: T): RuleFailure[];
}

/** Run a set of rules over a subject and collect a {@link ValidationReport}. */
export function runRules<T>(subject: T, rules: readonly Rule<T>[]): ValidationReport {
  const messages: ValidationMessage[] = [];
  for (const rule of rules) {
    for (const failure of rule.check(subject)) {
      messages.push({
        ruleId: rule.id,
        severity: rule.severity,
        path: failure.path,
        message: failure.message ?? rule.text,
      });
    }
  }
  return new ValidationReport(messages);
}

/**
 * Helper for the common case of a boolean assertion: when `ok` is false, emit a
 * single failure at `path`. Keeps individual rule definitions terse.
 */
export function assert(ok: boolean, path: string, message?: string): RuleFailure[] {
  return ok ? [] : [{ path, ...(message !== undefined ? { message } : {}) }];
}
