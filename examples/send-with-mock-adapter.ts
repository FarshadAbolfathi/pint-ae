/**
 * Example: build an invoice, validate it, serialise to UBL, and hand it to an
 * ASP adapter for delivery.
 *
 * Run after building the packages:
 *   pnpm build
 *   node --experimental-strip-types examples/send-with-mock-adapter.ts
 *
 * Swap `MockAspAdapter` for a real provider's adapter (which implements the
 * same `AspAdapter` interface) to transmit for real. This SDK never talks to
 * the tax authority itself.
 */
import { MockAspAdapter } from '@pint-ae/adapter-mock';
import { PintAE } from '@pint-ae/ae';

const result = PintAE.invoice()
  .withMeta({ id: 'INV-2025-001', issueDate: '2025-01-30', dueDate: '2025-02-06' })
  .seller({
    name: 'Supplier Legal Name',
    vatIdentifier: '100000000000003',
    address: { city: 'Dubai', countrySubentity: 'DXB', country: 'AE' },
  })
  .buyer({
    name: 'Buyer Legal Name',
    vatIdentifier: '134567890123003',
    address: { city: 'Abu Dhabi', countrySubentity: 'AUH', country: 'AE' },
  })
  .addLine({
    quantity: 100,
    unitCode: 'H87',
    price: 10,
    item: { name: 'Widget', taxCategory: { id: 'S', percent: 5 } },
  })
  .build();

if (!result.ok || result.document === null) {
  console.error('Invalid invoice:', result.report.errors);
  process.exit(1);
}

const xml = PintAE.toXml(result.document);

const adapter = new MockAspAdapter({ referencePrefix: 'ASP' });
const transmission = await adapter.send(result.document, xml);

console.log('Accepted:', transmission.accepted);
console.log('ASP reference:', transmission.reference);
console.log('Messages:', transmission.messages);
