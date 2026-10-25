import {
  toAmountString,
  type AllowanceCharge,
  type Document,
  type InvoiceLine,
  type Party,
  type PaymentMeans,
  type TaxTotal,
} from '@pint-ae/core';
import { create } from 'xmlbuilder2';

const UBL_INVOICE = 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2';
const UBL_CREDIT_NOTE = 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2';
const CAC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';
const CBC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';

type XmlObject = Record<string, unknown>;

/** An amount element with its `currencyID` attribute. */
function amount(value: string, currency: string): XmlObject {
  return { '@currencyID': currency, '#': toAmountString(value) };
}

/** Drop `undefined` entries so optional elements are omitted. */
function compact(obj: XmlObject): XmlObject {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function partyElement(party: Party): XmlObject {
  const postalAddress = compact({
    'cbc:StreetName': party.address.street,
    'cbc:AdditionalStreetName': party.address.additionalStreet,
    'cbc:CityName': party.address.city,
    'cbc:PostalZone': party.address.postalZone,
    'cbc:CountrySubentity': party.address.countrySubentity,
    'cac:Country': { 'cbc:IdentificationCode': party.address.country },
  });

  const partyTaxSchemes: XmlObject[] = [];
  if (party.vatIdentifier !== undefined) {
    partyTaxSchemes.push({
      'cbc:CompanyID': party.vatIdentifier,
      'cac:TaxScheme': { 'cbc:ID': 'VAT' },
    });
  }
  if (party.taxIdentifier !== undefined) {
    partyTaxSchemes.push({
      'cbc:CompanyID': party.taxIdentifier,
      'cac:TaxScheme': { 'cbc:ID': 'TIN' },
    });
  }

  const legalEntity = compact({
    'cbc:RegistrationName': party.name,
    'cbc:CompanyID': party.legalIdentifier
      ? compact({
          '@schemeAgencyID': party.legalIdentifier.schemeAgencyId,
          '@schemeAgencyName': party.legalIdentifier.schemeAgencyName,
          '#': party.legalIdentifier.id,
        })
      : undefined,
  });

  return compact({
    'cbc:EndpointID': party.endpoint
      ? { '@schemeID': party.endpoint.schemeId, '#': party.endpoint.id }
      : undefined,
    'cac:PostalAddress': postalAddress,
    ...(partyTaxSchemes.length > 0 ? { 'cac:PartyTaxScheme': partyTaxSchemes } : {}),
    'cac:PartyLegalEntity': legalEntity,
  });
}

function paymentMeansElement(pm: PaymentMeans): XmlObject {
  return compact({
    'cbc:PaymentMeansCode': pm.name ? { '@name': pm.name, '#': pm.code } : pm.code,
    'cbc:PaymentID': pm.remittanceInformation,
    'cac:PayeeFinancialAccount': pm.payeeAccountId
      ? compact({ 'cbc:ID': pm.payeeAccountId, 'cbc:Name': pm.payeeAccountName })
      : undefined,
  });
}

function allowanceChargeElement(ac: AllowanceCharge, currency: string): XmlObject {
  return compact({
    'cbc:ChargeIndicator': ac.isCharge,
    'cbc:AllowanceChargeReasonCode': ac.reasonCode,
    'cbc:AllowanceChargeReason': ac.reason,
    'cbc:MultiplierFactorNumeric': ac.percent,
    'cbc:Amount': amount(ac.amount, currency),
    'cbc:BaseAmount': ac.baseAmount !== undefined ? amount(ac.baseAmount, currency) : undefined,
    'cac:TaxCategory': ac.taxCategory
      ? compact({
          'cbc:ID': ac.taxCategory.id,
          'cbc:Percent': ac.taxCategory.percent,
          'cac:TaxScheme': { 'cbc:ID': ac.taxCategory.taxScheme },
        })
      : undefined,
  });
}

function taxTotalElement(taxTotal: TaxTotal, currency: string): XmlObject {
  return {
    'cbc:TaxAmount': amount(taxTotal.taxAmount, currency),
    'cbc:TaxIncludedIndicator': taxTotal.taxIncluded,
    'cac:TaxSubtotal': taxTotal.subtotals.map((s) => ({
      'cbc:TaxableAmount': amount(s.taxableAmount, currency),
      'cbc:TaxAmount': amount(s.taxAmount, currency),
      'cac:TaxCategory': compact({
        'cbc:ID': s.category.id,
        'cbc:Percent': s.category.percent,
        'cac:TaxScheme': { 'cbc:ID': s.category.taxScheme },
      }),
    })),
  };
}

function lineElement(line: InvoiceLine, currency: string, isCreditNote: boolean): XmlObject {
  const quantityKey = isCreditNote ? 'cbc:CreditedQuantity' : 'cbc:InvoicedQuantity';
  return compact({
    'cbc:ID': line.id,
    'cbc:Note': line.note,
    [quantityKey]: { '@unitCode': line.unitCode, '#': line.quantity },
    'cbc:LineExtensionAmount': amount(line.lineExtensionAmount, currency),
    ...(line.allowanceCharges.length > 0
      ? {
          'cac:AllowanceCharge': line.allowanceCharges.map((a) =>
            allowanceChargeElement(a, currency),
          ),
        }
      : {}),
    'cac:Item': compact({
      'cbc:Description': line.item.description,
      'cbc:Name': line.item.name,
      'cac:ClassifiedTaxCategory': compact({
        'cbc:ID': line.item.taxCategory.id,
        'cbc:Percent': line.item.taxCategory.percent,
        'cac:TaxScheme': { 'cbc:ID': line.item.taxCategory.taxScheme },
      }),
    }),
    'cac:Price': {
      'cbc:PriceAmount': amount(line.price.priceAmount, currency),
      'cbc:BaseQuantity': { '@unitCode': line.unitCode, '#': line.price.baseQuantity },
    },
  });
}

/** Serialise a typed document to PINT AE UBL 2.1 XML. */
export function toXml(doc: Document): string {
  const isCreditNote = doc.kind === 'creditNote';
  const rootName = isCreditNote ? 'CreditNote' : 'Invoice';
  const currency = doc.documentCurrencyCode;
  const typeCode = isCreditNote
    ? { 'cbc:CreditNoteTypeCode': doc.creditNoteTypeCode }
    : { 'cbc:InvoiceTypeCode': doc.invoiceTypeCode };
  const lineKey = isCreditNote ? 'cac:CreditNoteLine' : 'cac:InvoiceLine';

  const root = compact({
    '@xmlns': isCreditNote ? UBL_CREDIT_NOTE : UBL_INVOICE,
    '@xmlns:cac': CAC,
    '@xmlns:cbc': CBC,
    'cbc:CustomizationID': doc.customizationId,
    'cbc:ProfileID': doc.profileId,
    'cbc:ProfileExecutionID': doc.profileExecutionId,
    'cbc:ID': doc.id,
    'cbc:UUID': doc.uuid,
    'cbc:IssueDate': doc.issueDate,
    'cbc:DueDate': doc.dueDate,
    ...typeCode,
    'cbc:Note': doc.note,
    'cbc:DocumentCurrencyCode': currency,
    'cbc:TaxCurrencyCode': doc.taxCurrencyCode,
    'cbc:BuyerReference': doc.buyerReference,
    'cac:AccountingSupplierParty': { 'cac:Party': partyElement(doc.seller) },
    'cac:AccountingCustomerParty': { 'cac:Party': partyElement(doc.buyer) },
    ...(doc.paymentMeans.length > 0
      ? { 'cac:PaymentMeans': doc.paymentMeans.map(paymentMeansElement) }
      : {}),
    ...(doc.allowanceCharges.length > 0
      ? {
          'cac:AllowanceCharge': doc.allowanceCharges.map((a) =>
            allowanceChargeElement(a, currency),
          ),
        }
      : {}),
    'cac:TaxTotal': taxTotalElement(doc.taxTotal, currency),
    'cac:LegalMonetaryTotal': compact({
      'cbc:LineExtensionAmount': amount(doc.totals.lineExtensionAmount, currency),
      'cbc:TaxExclusiveAmount': amount(doc.totals.taxExclusiveAmount, currency),
      'cbc:TaxInclusiveAmount': amount(doc.totals.taxInclusiveAmount, currency),
      'cbc:AllowanceTotalAmount':
        doc.totals.allowanceTotalAmount !== undefined
          ? amount(doc.totals.allowanceTotalAmount, currency)
          : undefined,
      'cbc:ChargeTotalAmount':
        doc.totals.chargeTotalAmount !== undefined
          ? amount(doc.totals.chargeTotalAmount, currency)
          : undefined,
      'cbc:PrepaidAmount':
        doc.totals.prepaidAmount !== undefined
          ? amount(doc.totals.prepaidAmount, currency)
          : undefined,
      'cbc:PayableRoundingAmount':
        doc.totals.payableRoundingAmount !== undefined
          ? amount(doc.totals.payableRoundingAmount, currency)
          : undefined,
      'cbc:PayableAmount': amount(doc.totals.payableAmount, currency),
    }),
    [lineKey]: doc.lines.map((line) => lineElement(line, currency, isCreditNote)),
  });

  return create({ version: '1.0', encoding: 'UTF-8' }, { [rootName]: root }).end({
    prettyPrint: true,
  });
}
