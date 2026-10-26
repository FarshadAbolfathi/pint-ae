/**
 * A mock Accredited Service Provider (ASP) adapter.
 *
 * This SDK never transmits to the tax authority; an {@link AspAdapter} is the
 * seam where a real accredited provider plugs in. This mock implements that
 * interface for tests and examples: it records every submission in memory and
 * returns a configurable result instead of contacting a network.
 */
import type { AspAdapter, Document, TransmissionResult } from '@pint-ae/core';

/** A record of one document handed to the mock adapter. */
export interface MockSubmission {
  document: Document;
  xml: string;
  reference?: string;
  accepted: boolean;
}

export interface MockAspAdapterOptions {
  /** Whether the adapter accepts submissions. Defaults to `true`. */
  accept?: boolean;
  /** Prefix for the generated reference identifier. Defaults to `MOCK`. */
  referencePrefix?: string;
  /** Messages to return. Defaults to a single status message. */
  messages?: string[];
}

/** An in-memory {@link AspAdapter} for testing and examples. */
export class MockAspAdapter implements AspAdapter {
  readonly name = 'mock';

  /** Every submission handed to {@link send}, in order. */
  readonly submissions: MockSubmission[] = [];

  private counter = 0;

  constructor(private readonly options: MockAspAdapterOptions = {}) {}

  async send(document: Document, xml: string): Promise<TransmissionResult> {
    const accepted = this.options.accept ?? true;
    const reference = accepted
      ? `${this.options.referencePrefix ?? 'MOCK'}-${String(++this.counter).padStart(4, '0')}`
      : undefined;

    this.submissions.push({ document, xml, reference, accepted });

    const result: TransmissionResult = {
      accepted,
      messages: this.options.messages ?? [
        accepted ? 'Accepted by mock ASP.' : 'Rejected by mock ASP.',
      ],
    };
    if (reference !== undefined) result.reference = reference;
    return result;
  }

  /** The most recent submission, if any. */
  get lastSubmission(): MockSubmission | undefined {
    return this.submissions[this.submissions.length - 1];
  }
}
