/**
 * Run the official PINT AE Schematron over a UBL document using SaxonJS and the
 * compiled SEF files (see `scripts/build-sef.mjs`). This is the authoritative
 * validation path; the native TypeScript rules exist for speed and type safety.
 */
import type { ValidationMessage } from '@pint-ae/core';
import { parseSvrl } from './svrl.js';

/** The document kinds the Schematron is bound to. */
export type SchematronKind = 'invoice' | 'creditNote';

/** The names of the compiled SEF files. */
export type SefName = 'invoice-core' | 'invoice-aligned' | 'creditnote-core' | 'creditnote-aligned';

/** Loads a SEF file's JSON text by name (environment-specific). */
export type SefLoader = (name: SefName) => Promise<string>;

function sefNamesFor(kind: SchematronKind): [SefName, SefName] {
  return kind === 'creditNote'
    ? ['creditnote-core', 'creditnote-aligned']
    : ['invoice-core', 'invoice-aligned'];
}

// Parsed SEF objects are cached so each stylesheet's JSON is parsed only once.
const sefCache = new Map<SefName, unknown>();

async function loadSefInternal(name: SefName, loadSef: SefLoader): Promise<unknown> {
  const cached = sefCache.get(name);
  if (cached !== undefined) return cached;
  const parsed = JSON.parse(await loadSef(name)) as unknown;
  sefCache.set(name, parsed);
  return parsed;
}

/**
 * Validate a UBL XML string against the official Schematron for the given
 * document kind, returning structured messages. Runs the core PINT rules and
 * the UAE jurisdiction-aligned rules and merges the results.
 */
export async function runSchematron(
  xml: string,
  kind: SchematronKind,
  loadSef: SefLoader,
): Promise<ValidationMessage[]> {
  // Load SaxonJS lazily so it is only pulled in (and code-split by bundlers)
  // when `full` validation actually runs.
  const { default: SaxonJS } = await import('saxon-js');
  const messages: ValidationMessage[] = [];
  for (const name of sefNamesFor(kind)) {
    const stylesheetInternal = await loadSefInternal(name, loadSef);
    const result = await SaxonJS.transform(
      { stylesheetInternal, sourceText: xml, destination: 'serialized' },
      'async',
    );
    messages.push(...parseSvrl(result.principalResult));
  }
  return messages;
}
