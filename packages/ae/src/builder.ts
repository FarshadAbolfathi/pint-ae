import {
  creditNoteSchema,
  invoiceSchema,
  money,
  type AmountInput,
  type CreditNote,
  type Document,
  type Invoice,
  type Party,
  type PaymentMeans,
  type ValidationMessage,
} from '@pint-ae/core';
import { ValidationReport } from '@pint-ae/core';
import type { ZodError } from 'zod';
import { buildTaxSubtotals, computeTotals, lineNetAmount, type TaxableInput } from './calc.js';
import { validateDocument } from './rules/index.js';

/** A VAT category as supplied to the builder. */
export interface TaxCategoryInput {
  id: string;
  percent?: AmountInput;
  exemptionReasonCode?: string;
  exemptionReason?: string;
  taxScheme?: string;
}

/** An allowance or charge as supplied to the builder. */
export interface AllowanceChargeInput {
  isCharge: boolean;
  amount: AmountInput;
  baseAmount?: AmountInput;
  percent?: AmountInput;
  reasonCode?: string;
  reason?: string;
  taxCategory?: TaxCategoryInput;
}

/** A line as supplied to the builder. The net amount is computed unless given. */
export interface LineInput {
  id?: string;
  quantity: AmountInput;
  unitCode: string;
  price: AmountInput | { amount: AmountInput; baseQuantity?: AmountInput };
  item: { name: string; description?: string; taxCategory: TaxCategoryInput };
  allowanceCharges?: AllowanceChargeInput[];
  note?: string;
  /** Override the computed net amount (IBT-131). */
  lineExtensionAmount?: AmountInput;
}

/** Document-level fields accepted by the builder. */
export interface DocumentMeta {
  id?: string;
  uuid?: string;
  issueDate?: string;
  dueDate?: string;
  documentCurrencyCode?: string;
  taxCurrencyCode?: string;
  note?: string;
  buyerReference?: string;
  customizationId?: string;
  profileId?: string;
  profileExecutionId?: string;
  invoiceTypeCode?: string;
  creditNoteTypeCode?: string;
  prepaidAmount?: AmountInput;
  payableRoundingAmount?: AmountInput;
}

/** The result of building a document. */
export type BuildResult<T extends Document> = {
  ok: boolean;
  /** The parsed document, or `null` if the input failed schema validation. */
  document: T | null;
  report: ValidationReport;
};

function schemaReport(error: ZodError): ValidationReport {
  const messages: ValidationMessage[] = error.issues.map((issue) => ({
    ruleId: 'schema',
    severity: 'fatal',
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
  return new ValidationReport(messages);
}

/**
 * Fluent builder for UAE PINT AE documents. Amounts, the VAT breakdown and the
 * monetary totals are computed automatically so the output satisfies the PINT
 * calculation rules; any value can still be overridden.
 */
export class DocumentBuilder<T extends Document> {
  private meta: DocumentMeta = {};
  private sellerParty?: Party;
  private buyerParty?: Party;
  private readonly lines: LineInput[] = [];
  private readonly documentAllowanceCharges: AllowanceChargeInput[] = [];
  private readonly payments: PaymentMeans[] = [];

  constructor(private readonly kind: T['kind']) {}

  /** Set document-level metadata (id, dates, currency, …). */
  withMeta(meta: DocumentMeta): this {
    this.meta = { ...this.meta, ...meta };
    return this;
  }

  seller(party: Party): this {
    this.sellerParty = party;
    return this;
  }

  buyer(party: Party): this {
    this.buyerParty = party;
    return this;
  }

  addLine(line: LineInput): this {
    this.lines.push(line);
    return this;
  }

  /** Add a document-level allowance (discount) or charge. */
  addAllowanceCharge(ac: AllowanceChargeInput): this {
    this.documentAllowanceCharges.push(ac);
    return this;
  }

  addPaymentMeans(means: PaymentMeans): this {
    this.payments.push(means);
    return this;
  }

  private normalizePrice(price: LineInput['price']): { amount: string; baseQuantity: string } {
    if (typeof price === 'object') {
      return {
        amount: money(price.amount).toString(),
        baseQuantity: money(price.baseQuantity ?? '1').toString(),
      };
    }
    return { amount: money(price).toString(), baseQuantity: '1' };
  }

  /** Assemble the raw (pre-validation) document object with computed amounts. */
  private assemble(): Record<string, unknown> {
    const taxableContributions: TaxableInput[] = [];

    const lines = this.lines.map((line, index) => {
      const price = this.normalizePrice(line.price);
      const allowanceCharges = (line.allowanceCharges ?? []).map((ac) => ({
        ...ac,
        amount: money(ac.amount).toString(),
      }));
      const net =
        line.lineExtensionAmount !== undefined
          ? money(line.lineExtensionAmount).toString()
          : lineNetAmount({
              quantity: money(line.quantity).toString(),
              priceAmount: price.amount,
              baseQuantity: price.baseQuantity,
              allowanceCharges: allowanceCharges.map((a) => ({
                isCharge: a.isCharge,
                amount: a.amount,
              })),
            });

      const category = line.item.taxCategory;
      taxableContributions.push({
        net,
        categoryId: category.id,
        ...(category.percent !== undefined ? { percent: money(category.percent).toString() } : {}),
      });

      return {
        id: line.id ?? String(index + 1),
        quantity: line.quantity,
        unitCode: line.unitCode,
        lineExtensionAmount: net,
        note: line.note,
        item: {
          name: line.item.name,
          description: line.item.description,
          taxCategory: category,
        },
        price: { priceAmount: price.amount, baseQuantity: price.baseQuantity },
        allowanceCharges: line.allowanceCharges ?? [],
      };
    });

    // Document-level allowances/charges feed the VAT breakdown by category.
    for (const ac of this.documentAllowanceCharges) {
      if (!ac.taxCategory) continue;
      const signed = ac.isCharge ? money(ac.amount) : money(ac.amount).negated();
      taxableContributions.push({
        net: signed.toString(),
        categoryId: ac.taxCategory.id,
        ...(ac.taxCategory.percent !== undefined
          ? { percent: money(ac.taxCategory.percent).toString() }
          : {}),
      });
    }

    const subtotals = buildTaxSubtotals(taxableContributions);
    const totalTax = subtotals
      .reduce((acc, s) => acc.plus(money(s.taxAmount)), money(0))
      .toString();

    const totals = computeTotals({
      lineNets: lines.map((l) => l.lineExtensionAmount),
      documentAllowances: this.documentAllowanceCharges
        .filter((a) => !a.isCharge)
        .map((a) => money(a.amount).toString()),
      documentCharges: this.documentAllowanceCharges
        .filter((a) => a.isCharge)
        .map((a) => money(a.amount).toString()),
      totalTax,
      ...(this.meta.prepaidAmount !== undefined
        ? { prepaidAmount: money(this.meta.prepaidAmount).toString() }
        : {}),
      ...(this.meta.payableRoundingAmount !== undefined
        ? { payableRoundingAmount: money(this.meta.payableRoundingAmount).toString() }
        : {}),
    });

    const typeCodeField =
      this.kind === 'invoice'
        ? { invoiceTypeCode: this.meta.invoiceTypeCode }
        : { creditNoteTypeCode: this.meta.creditNoteTypeCode };

    return {
      kind: this.kind,
      ...typeCodeField,
      customizationId: this.meta.customizationId,
      profileId: this.meta.profileId,
      profileExecutionId: this.meta.profileExecutionId,
      id: this.meta.id,
      uuid: this.meta.uuid,
      issueDate: this.meta.issueDate,
      dueDate: this.meta.dueDate,
      documentCurrencyCode: this.meta.documentCurrencyCode,
      taxCurrencyCode: this.meta.taxCurrencyCode,
      note: this.meta.note,
      buyerReference: this.meta.buyerReference,
      seller: this.sellerParty,
      buyer: this.buyerParty,
      paymentMeans: this.payments,
      allowanceCharges: this.documentAllowanceCharges,
      lines,
      taxTotal: {
        taxAmount: totalTax,
        taxIncluded: false,
        subtotals: subtotals.map((s) => ({
          taxableAmount: s.taxableAmount,
          taxAmount: s.taxAmount,
          category: { id: s.category.id, percent: s.category.percent, taxScheme: 'VAT' },
        })),
      },
      totals: {
        lineExtensionAmount: totals.lineExtensionAmount,
        taxExclusiveAmount: totals.taxExclusiveAmount,
        taxInclusiveAmount: totals.taxInclusiveAmount,
        allowanceTotalAmount: totals.allowanceTotalAmount,
        chargeTotalAmount: totals.chargeTotalAmount,
        payableAmount: totals.payableAmount,
        prepaidAmount: this.meta.prepaidAmount,
        payableRoundingAmount: this.meta.payableRoundingAmount,
      },
    };
  }

  /** Build, validate and return a typed {@link BuildResult}. Never throws. */
  build(): BuildResult<T> {
    const schema = this.kind === 'invoice' ? invoiceSchema : creditNoteSchema;
    const parsed = schema.safeParse(this.assemble());
    if (!parsed.success) {
      return { ok: false, document: null, report: schemaReport(parsed.error) };
    }
    const document = parsed.data as T;
    const report = validateDocument(document);
    return { ok: report.valid, document, report };
  }

  /** Build and return the document, throwing if it is invalid. */
  buildOrThrow(): T {
    const result = this.build();
    if (!result.ok || result.document === null) {
      const detail = result.report.messages
        .map((m) => `  [${m.ruleId}] ${m.path}: ${m.message}`)
        .join('\n');
      throw new Error(`Document is invalid:\n${detail}`);
    }
    return result.document;
  }
}

/** Start building a UAE PINT AE tax invoice. */
export function invoice(): DocumentBuilder<Invoice> {
  return new DocumentBuilder<Invoice>('invoice');
}

/** Start building a UAE PINT AE tax credit note. */
export function creditNote(): DocumentBuilder<CreditNote> {
  return new DocumentBuilder<CreditNote>('creditNote');
}
