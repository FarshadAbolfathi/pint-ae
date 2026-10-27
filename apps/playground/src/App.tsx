import { PintAE, type ValidationMessage, type ValidationMode } from '@pint-ae/ae';
import { useCallback, useMemo, useRef, useState } from 'react';
import { SAMPLE_INVOICE_XML } from './sample.js';

const NATIVE_RULES = 22;
const TOTAL_RULES = 303;
const VERSION = '0.1.0';

const INVALID_SAMPLE_XML = SAMPLE_INVOICE_XML.replace(
  '<cbc:DocumentCurrencyCode>AED</cbc:DocumentCurrencyCode>',
  '<cbc:DocumentCurrencyCode>XYZ</cbc:DocumentCurrencyCode>',
)
  .replace('<cbc:IssueDate>2025-01-30</cbc:IssueDate>', '<cbc:IssueDate>2025-13-45</cbc:IssueDate>')
  .replace(
    '<cbc:CustomizationID>urn:peppol:pint:billing-1@ae-1</cbc:CustomizationID>',
    '<cbc:CustomizationID>not-pint-ae</cbc:CustomizationID>',
  );

interface Result {
  valid: boolean;
  messages: ValidationMessage[];
  ms: number;
  mode: ValidationMode;
  note?: string;
  error?: string;
}

// The official Schematron (full mode) runs via SaxonJS in Node and the CLI.
// SaxonJS's browser runtime is not redistributable via npm/CDN, so this
// in-browser demo validates with the fast native rules.
const FULL_NOTE =
  'Full (official Schematron) validation runs in Node and the `pint-ae` CLI. This in-browser demo uses the fast native rules.';

export function App(): JSX.Element {
  const [xml, setXml] = useState('');
  const [mode, setMode] = useState<ValidationMode>('full');
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const onValidate = useCallback(async () => {
    if (xml.trim() === '') {
      setResult({
        valid: false,
        messages: [],
        ms: 0,
        mode,
        error: 'Paste or load an invoice first.',
      });
      return;
    }
    setBusy(true);
    const started = performance.now();
    try {
      // The browser runs the native rules; full Schematron validation is a
      // Node/CLI capability (see FULL_NOTE).
      const report = await PintAE.validate(xml, { mode: 'fast' });
      setResult({
        valid: report.valid,
        messages: [...report.messages],
        ms: Math.round(performance.now() - started),
        mode,
        ...(mode === 'full' ? { note: FULL_NOTE } : {}),
      });
    } catch (err) {
      setResult({ valid: false, messages: [], ms: 0, mode, error: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }, [xml, mode]);

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void file.text().then((text) => {
      setXml(text);
      setResult(null);
    });
  }, []);

  const errors = useMemo(
    () => result?.messages.filter((m) => m.severity === 'fatal') ?? [],
    [result],
  );
  const warnings = useMemo(
    () => result?.messages.filter((m) => m.severity === 'warning') ?? [],
    [result],
  );

  return (
    <main className="app">
      <header>
        <h1>pint-ae playground</h1>
        <p className="tagline">
          Validate a UAE <strong>PINT AE</strong> (Peppol, UBL 2.1) e-invoice in your browser.
          Nothing is uploaded to a server.
        </p>
        <p className="disclaimer">
          Status: not certified — for preparation and validation only. Rules trace to the official
          OpenPeppol PINT AE Billing v1.0.3 specification.
        </p>
      </header>

      <section className="toolbar">
        <button type="button" onClick={onValidate} className="primary" disabled={busy}>
          {busy ? 'Validating…' : 'Validate'}
        </button>
        <div className="modes" role="radiogroup" aria-label="Validation mode">
          <label className={mode === 'full' ? 'on' : ''}>
            <input
              type="radio"
              name="mode"
              checked={mode === 'full'}
              onChange={() => setMode('full')}
            />
            Full (Schematron)
          </label>
          <label className={mode === 'fast' ? 'on' : ''}>
            <input
              type="radio"
              name="mode"
              checked={mode === 'fast'}
              onChange={() => setMode('fast')}
            />
            Fast (native)
          </label>
        </div>
        <span className="spacer" />
        <button type="button" onClick={() => fileInput.current?.click()}>
          Upload XML…
        </button>
        <button
          type="button"
          onClick={() => {
            setXml(SAMPLE_INVOICE_XML);
            setResult(null);
          }}
        >
          Load valid sample
        </button>
        <button
          type="button"
          onClick={() => {
            setXml(INVALID_SAMPLE_XML);
            setResult(null);
          }}
        >
          Load invalid sample
        </button>
        <button
          type="button"
          onClick={() => {
            setXml('');
            setResult(null);
          }}
        >
          Clear
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".xml,text/xml,application/xml"
          onChange={onFile}
          hidden
        />
      </section>

      <textarea
        className="editor"
        value={xml}
        onChange={(e) => setXml(e.target.value)}
        placeholder="Paste UBL Invoice or CreditNote XML here, or click “Load valid sample” / “Load invalid sample”."
        spellCheck={false}
      />

      {result && (
        <section className="result" aria-live="polite">
          {result.error ? (
            <div className="banner error">{result.error}</div>
          ) : (
            <>
              <div className={`banner ${result.valid ? 'ok' : 'error'}`}>
                {result.valid
                  ? `✓ Valid — ${warnings.length} warning(s)`
                  : `✗ Invalid — ${errors.length} error(s), ${warnings.length} warning(s)`}
                <span className="meta">
                  {result.mode} mode · {result.ms} ms
                </span>
              </div>
              {result.note && <div className="banner note">{result.note}</div>}
              {result.messages.length > 0 && (
                <table className="messages">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Rule</th>
                      <th>Path</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.messages.map((m, i) => (
                      <tr key={i} className={m.severity}>
                        <td>{m.severity}</td>
                        <td>
                          <code>{m.ruleId}</code>
                        </td>
                        <td className="path">
                          <code>{m.path}</code>
                        </td>
                        <td>{m.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </section>
      )}

      <footer>
        <span>
          pint-ae v{VERSION} · coverage: {NATIVE_RULES} native / {TOTAL_RULES} Schematron
        </span>
        <a href="https://github.com/FarshadAbolfathi/pint-ae">source on GitHub</a>
      </footer>
    </main>
  );
}
