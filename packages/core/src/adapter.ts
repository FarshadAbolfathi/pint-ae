import type { Document } from './model/index.js';

/**
 * The result of handing a document to an Accredited Service Provider (ASP).
 * This SDK never transmits to the tax authority itself; an adapter is the seam
 * where a concrete ASP integration plugs in (implemented in a later milestone).
 */
export interface TransmissionResult {
  /** Whether the ASP accepted the document for delivery. */
  accepted: boolean;
  /** The ASP's reference / tracking identifier, when provided. */
  reference?: string;
  /** Any messages returned by the ASP. */
  messages?: string[];
}

/**
 * Interface that an ASP integration implements. Kept deliberately small and
 * transport-agnostic so that any accredited provider can be plugged in.
 */
export interface AspAdapter {
  /** A stable name for the adapter, e.g. `"mock"` or a provider slug. */
  readonly name: string;
  /** Send a built, validated document for delivery via the ASP. */
  send(document: Document, xml: string): Promise<TransmissionResult>;
}
