/**
 * Build a document from a plain JSON description. Used by the CLI's
 * `pint-ae build <json>` command and available to SDK consumers who prefer a
 * declarative input over the fluent builder.
 */
import { ValidationReport, type Document } from '@pint-ae/core';
import { z } from 'zod';
import {
  creditNote,
  invoice,
  type AllowanceChargeInput,
  type BuildResult,
  type DocumentMeta,
  type LineInput,
} from './builder.js';
import type { Party } from '@pint-ae/core';

const objectSchema = z.record(z.unknown());

/** The top-level shape of a build-input JSON document. Field-level validation
 * is deferred to the model schema during `build()`. */
const buildInputSchema = z.object({
  kind: z.enum(['invoice', 'creditNote']).optional(),
  meta: objectSchema.optional(),
  seller: objectSchema.optional(),
  buyer: objectSchema.optional(),
  lines: z.array(objectSchema).optional(),
  allowanceCharges: z.array(objectSchema).optional(),
  paymentMeans: z.array(objectSchema).optional(),
});

/**
 * Build a document from a parsed JSON value. Returns a {@link BuildResult};
 * if the top-level shape is wrong, the report carries `schema` messages.
 */
export function buildFromJson(input: unknown): BuildResult<Document> {
  const parsed = buildInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      document: null,
      report: new ValidationReport(
        parsed.error.issues.map((issue) => ({
          ruleId: 'schema',
          severity: 'fatal',
          path: issue.path.join('.') || '(root)',
          message: issue.message,
        })),
      ),
    };
  }

  const input_ = parsed.data;
  const builder =
    input_.kind === 'creditNote'
      ? creditNote()
      : // default to invoice
        invoice();

  if (input_.meta) builder.withMeta(input_.meta as DocumentMeta);
  if (input_.seller) builder.seller(input_.seller as unknown as Party);
  if (input_.buyer) builder.buyer(input_.buyer as unknown as Party);
  for (const line of input_.lines ?? []) builder.addLine(line as unknown as LineInput);
  for (const ac of input_.allowanceCharges ?? [])
    builder.addAllowanceCharge(ac as unknown as AllowanceChargeInput);
  for (const pm of input_.paymentMeans ?? [])
    builder.addPaymentMeans(pm as unknown as Parameters<typeof builder.addPaymentMeans>[0]);

  return builder.build() as BuildResult<Document>;
}
