/** Severity of a validation message. `fatal` means the document is invalid. */
export type Severity = 'fatal' | 'warning';

/**
 * A single structured validation result. Mirrors the shape required by
 * Milestone 1: `{ ruleId, severity, path, message }`.
 */
export interface ValidationMessage {
  /** Official rule identifier, e.g. `ibr-132-ae`. */
  ruleId: string;
  severity: Severity;
  /**
   * A location for the problem. For model-level rules this is a dotted path
   * into the typed invoice (e.g. `seller.vatIdentifier`); after XML binding it
   * can be an XPath-like location.
   */
  path: string;
  /** Human-readable explanation, taken from the official assertion text. */
  message: string;
}

/** The outcome of validating a document against a set of rules. */
export class ValidationReport {
  readonly messages: readonly ValidationMessage[];

  constructor(messages: readonly ValidationMessage[]) {
    this.messages = messages;
  }

  /** Fatal messages only. */
  get errors(): ValidationMessage[] {
    return this.messages.filter((m) => m.severity === 'fatal');
  }

  /** Warning messages only. */
  get warnings(): ValidationMessage[] {
    return this.messages.filter((m) => m.severity === 'warning');
  }

  /** True when there are no fatal messages. */
  get valid(): boolean {
    return this.errors.length === 0;
  }

  /** Convenience: a plain JSON-serialisable object. */
  toJSON(): { valid: boolean; messages: readonly ValidationMessage[] } {
    return { valid: this.valid, messages: this.messages };
  }
}
