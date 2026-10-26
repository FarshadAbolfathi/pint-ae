import type { Document } from '@pint-ae/core';
import { describe, expect, it } from 'vitest';
import { MockAspAdapter } from './index.js';

const doc = { kind: 'invoice', id: 'INV-1' } as unknown as Document;

describe('MockAspAdapter', () => {
  it('accepts by default and returns a reference', async () => {
    const adapter = new MockAspAdapter();
    const result = await adapter.send(doc, '<Invoice/>');
    expect(adapter.name).toBe('mock');
    expect(result.accepted).toBe(true);
    expect(result.reference).toBe('MOCK-0001');
    expect(result.messages).toEqual(['Accepted by mock ASP.']);
  });

  it('records every submission in order', async () => {
    const adapter = new MockAspAdapter();
    await adapter.send(doc, '<a/>');
    await adapter.send(doc, '<b/>');
    expect(adapter.submissions).toHaveLength(2);
    expect(adapter.submissions[1]?.reference).toBe('MOCK-0002');
    expect(adapter.lastSubmission?.xml).toBe('<b/>');
  });

  it('can be configured to reject, with no reference', async () => {
    const adapter = new MockAspAdapter({ accept: false });
    const result = await adapter.send(doc, '<Invoice/>');
    expect(result.accepted).toBe(false);
    expect(result.reference).toBeUndefined();
    expect(result.messages).toEqual(['Rejected by mock ASP.']);
    expect(adapter.lastSubmission?.accepted).toBe(false);
  });

  it('honours a custom reference prefix and messages', async () => {
    const adapter = new MockAspAdapter({ referencePrefix: 'ASP', messages: ['queued'] });
    const result = await adapter.send(doc, '<Invoice/>');
    expect(result.reference).toBe('ASP-0001');
    expect(result.messages).toEqual(['queued']);
  });

  it('starts with no submissions', () => {
    expect(new MockAspAdapter().lastSubmission).toBeUndefined();
  });
});
