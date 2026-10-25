/**
 * Parse PINT AE UBL 2.1 XML into the typed domain model (Milestone 2).
 *
 * Uses fast-xml-parser configured to keep every value as a string
 * (`parseTagValue: false`) so that identifiers like TRNs and monetary amounts
 * are never coerced to JavaScript numbers (which would lose precision). See
 * `docs/adr/0002-xml-library.md`.
 */
import {
  creditNoteSchema,
  invoiceSchema,
  ValidationReport,
  type Document,
  type ValidationMessage,
} from '@pint-ae/core';
import { XMLParser } from 'fast-xml-parser';
import type { ZodError } from 'zod';

/** Thrown when XML cannot be parsed into a valid document. */
export class XmlParseError extends Error {
  constructor(
    message: string,
    readonly report: ValidationReport,
  ) {
    super(message);
    this.name = 'XmlParseError';
  }
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

type XmlNode = Record<string, unknown> | string | undefined;

/** Normalise a possibly-single child into an array. */
function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Extract the text content of an element (handling the attribute case). */
function text(node: XmlNode): string | undefined {
  if (node === undefined) return undefined;
  if (typeof node === 'string') return node;
  const t = node['#text'];
  return t === undefined ? undefined : String(t);
}

/** Read an attribute from an element node. */
function attr(node: XmlNode, name: string): string | undefined {
  if (node === undefined || typeof node === 'string') return undefined;
  const v = node[`@_${name}`];
  return v === undefined ? undefined : String(v);
}

/** Get a child object/string by local name. */
function child(node: XmlNode, name: string): XmlNode {
  if (node === undefined || typeof node === 'string') return undefined;
  return node[name] as XmlNode;
}

function parseAddress(node: XmlNode): Record<string, unknown> {
  const country = child(node, 'Country');
  return {
    street: text(child(node, 'StreetName')),
    additionalStreet: text(child(node, 'AdditionalStreetName')),
    city: text(child(node, 'CityName')),
    postalZone: text(child(node, 'PostalZone')),
    countrySubentity: text(child(node, 'CountrySubentity')),
    country: text(child(country, 'IdentificationCode')),
  };
}

function parseTaxCategory(node: XmlNode): Record<string, unknown> | undefined {
  if (node === undefined) return undefined;
  const scheme = child(node, 'TaxScheme');
  return {
    id: text(child(node, 'ID')),
    percent: text(child(node, 'Percent')),
    exemptionReasonCode: text(child(node, 'TaxExemptionReasonCode')),
    exemptionReason: text(child(node, 'TaxExemptionReason')),
    taxScheme: text(child(scheme, 'ID')) ?? 'VAT',
  };
}

function parseParty(node: XmlNode): Record<string, unknown> {
  const legalEntity = child(node, 'PartyLegalEntity');
  const endpoint = child(node, 'EndpointID');

  let vatIdentifier: string | undefined;
  let taxIdentifier: string | undefined;
  for (const pts of asArray(child(node, 'PartyTaxScheme') as XmlNode[])) {
    const schemeId = text(child(child(pts, 'TaxScheme'), 'ID'));
    const companyId = text(child(pts, 'CompanyID'));
    if (schemeId?.toUpperCase() === 'VAT') vatIdentifier = companyId;
    else taxIdentifier = companyId;
  }

  const legalId = child(legalEntity, 'CompanyID');
  const legalIdentifier =
    legalId !== undefined
      ? {
          id: text(legalId),
          schemeAgencyId: attr(legalId, 'schemeAgencyID'),
          schemeAgencyName: attr(legalId, 'schemeAgencyName'),
        }
      : undefined;

  return {
    name: text(child(legalEntity, 'RegistrationName')),
    endpoint:
      endpoint !== undefined
        ? { id: text(endpoint), schemeId: attr(endpoint, 'schemeID') }
        : undefined,
    vatIdentifier,
    taxIdentifier,
    legalIdentifier,
    address: parseAddress(child(node, 'PostalAddress')),
  };
}

function parseAllowanceCharge(node: XmlNode): Record<string, unknown> {
  return {
    isCharge: text(child(node, 'ChargeIndicator')) === 'true',
    amount: text(child(node, 'Amount')),
    baseAmount: text(child(node, 'BaseAmount')),
    percent: text(child(node, 'MultiplierFactorNumeric')),
    reasonCode: text(child(node, 'AllowanceChargeReasonCode')),
    reason: text(child(node, 'AllowanceChargeReason')),
    taxCategory: parseTaxCategory(child(node, 'TaxCategory')),
  };
}

function parsePaymentMeans(node: XmlNode): Record<string, unknown> {
  const code = child(node, 'PaymentMeansCode');
  const account = child(node, 'PayeeFinancialAccount');
  return {
    code: text(code),
    name: attr(code, 'name'),
    remittanceInformation: text(child(node, 'PaymentID')),
    payeeAccountId: text(child(account, 'ID')),
    payeeAccountName: text(child(account, 'Name')),
  };
}

function parseLine(node: XmlNode, isCreditNote: boolean): Record<string, unknown> {
  const qtyNode = child(node, isCreditNote ? 'CreditedQuantity' : 'InvoicedQuantity');
  const item = child(node, 'Item');
  const price = child(node, 'Price');
  const baseQty = child(price, 'BaseQuantity');
  return {
    id: text(child(node, 'ID')),
    quantity: text(qtyNode),
    unitCode: attr(qtyNode, 'unitCode'),
    lineExtensionAmount: text(child(node, 'LineExtensionAmount')),
    note: text(child(node, 'Note')),
    item: {
      name: text(child(item, 'Name')),
      description: text(child(item, 'Description')),
      taxCategory: parseTaxCategory(child(item, 'ClassifiedTaxCategory')),
    },
    price: {
      priceAmount: text(child(price, 'PriceAmount')),
      baseQuantity: text(baseQty) ?? '1',
    },
    allowanceCharges: asArray(child(node, 'AllowanceCharge') as XmlNode[]).map(parseAllowanceCharge),
  };
}

function parseTaxTotal(node: XmlNode): Record<string, unknown> {
  // An invoice may carry a second TaxTotal for the tax-accounting currency with
  // no breakdown; prefer the one that has a TaxSubtotal.
  const totals = asArray(node as XmlNode[]);
  const primary = totals.find((t) => child(t, 'TaxSubtotal') !== undefined) ?? totals[0];
  return {
    taxAmount: text(child(primary, 'TaxAmount')),
    taxIncluded: text(child(primary, 'TaxIncludedIndicator')) === 'true',
    subtotals: asArray(child(primary, 'TaxSubtotal') as XmlNode[]).map((s) => ({
      taxableAmount: text(child(s, 'TaxableAmount')),
      taxAmount: text(child(s, 'TaxAmount')),
      category: parseTaxCategory(child(s, 'TaxCategory')),
    })),
  };
}

function parseTotals(node: XmlNode): Record<string, unknown> {
  return {
    lineExtensionAmount: text(child(node, 'LineExtensionAmount')),
    taxExclusiveAmount: text(child(node, 'TaxExclusiveAmount')),
    taxInclusiveAmount: text(child(node, 'TaxInclusiveAmount')),
    allowanceTotalAmount: text(child(node, 'AllowanceTotalAmount')),
    chargeTotalAmount: text(child(node, 'ChargeTotalAmount')),
    prepaidAmount: text(child(node, 'PrepaidAmount')),
    payableRoundingAmount: text(child(node, 'PayableRoundingAmount')),
    payableAmount: text(child(node, 'PayableAmount')),
  };
}

/** Build the raw (pre-validation) model object from a parsed UBL root. */
function assembleFromRoot(root: XmlNode, isCreditNote: boolean): Record<string, unknown> {
  const supplier = child(child(root, 'AccountingSupplierParty'), 'Party');
  const customer = child(child(root, 'AccountingCustomerParty'), 'Party');
  const lineKey = isCreditNote ? 'CreditNoteLine' : 'InvoiceLine';
  const typeCode = isCreditNote
    ? { creditNoteTypeCode: text(child(root, 'CreditNoteTypeCode')) }
    : { invoiceTypeCode: text(child(root, 'InvoiceTypeCode')) };

  return {
    kind: isCreditNote ? 'creditNote' : 'invoice',
    ...typeCode,
    customizationId: text(child(root, 'CustomizationID')),
    profileId: text(child(root, 'ProfileID')),
    profileExecutionId: text(child(root, 'ProfileExecutionID')),
    id: text(child(root, 'ID')),
    uuid: text(child(root, 'UUID')),
    issueDate: text(child(root, 'IssueDate')),
    dueDate: text(child(root, 'DueDate')),
    documentCurrencyCode: text(child(root, 'DocumentCurrencyCode')),
    taxCurrencyCode: text(child(root, 'TaxCurrencyCode')),
    note: text(child(root, 'Note')),
    buyerReference: text(child(root, 'BuyerReference')),
    seller: parseParty(supplier),
    buyer: parseParty(customer),
    paymentMeans: asArray(child(root, 'PaymentMeans') as XmlNode[]).map(parsePaymentMeans),
    allowanceCharges: asArray(child(root, 'AllowanceCharge') as XmlNode[]).map(parseAllowanceCharge),
    lines: asArray(child(root, lineKey) as XmlNode[]).map((l) => parseLine(l, isCreditNote)),
    taxTotal: parseTaxTotal(child(root, 'TaxTotal')),
    totals: parseTotals(child(root, 'LegalMonetaryTotal')),
  };
}

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
 * Parse UBL XML into a validated typed document plus a report. On a schema
 * failure `document` is `null` and `report` carries the `schema` messages.
 */
export function parseDocument(xml: string): {
  document: Document | null;
  report: ValidationReport;
} {
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const isCreditNote = 'CreditNote' in parsed;
  const root = (parsed['Invoice'] ?? parsed['CreditNote']) as XmlNode;
  if (root === undefined) {
    return {
      document: null,
      report: new ValidationReport([
        {
          ruleId: 'schema',
          severity: 'fatal',
          path: '(root)',
          message: 'Root element is not a UBL Invoice or CreditNote.',
        },
      ]),
    };
  }

  const schema = isCreditNote ? creditNoteSchema : invoiceSchema;
  const result = schema.safeParse(assembleFromRoot(root, isCreditNote));
  if (!result.success) {
    return { document: null, report: schemaReport(result.error) };
  }
  return { document: result.data as Document, report: new ValidationReport([]) };
}

/** Parse UBL XML into a typed document, throwing {@link XmlParseError} if it
 * does not satisfy the schema. */
export function fromXml(xml: string): Document {
  const { document, report } = parseDocument(xml);
  if (document === null) {
    throw new XmlParseError('XML is not a valid PINT AE document', report);
  }
  return document;
}
