import { PintAE, type ValidationMessage } from '@pint-ae/ae';
import { useCallback, useMemo, useRef, useState } from 'react';
import { SAMPLE_INVOICE_XML } from './sample.js';

interface Result {
  valid: boolean;
  messages: ValidationMessage[];
  error?: string;
}

function validate(xml: string): Result {
  if (xml.trim() === '') {
    return { valid: false, messages: [], error: 'Paste or upload a UBL XML invoice first.' };
  }
  try {
    const report = PintAE.validate(xml);
    return { valid: report.valid, messages: [...report.messages] };
  } catch (err) {
    return { valid: false, messages: [], error: (err as Error).message };
  }
}

export function App(): JSX.Element {
  const [xml, setXml] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const onValidate = useCallback(() => setResult(validate(xml)), [xml]);
  const onSample = useCallback(() => {
    setXml(SAMPLE_INVOICE_XML);
    setResult(null);
  }, []);
  const onClear = useCallback(() => {
    setXml('');
    setResult(null);
  }, []);

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
          Validate a UAE <strong>PINT AE</strong> (Peppol, UBL 2.1) e-invoice entirely in your
          browser. Nothing is uploaded to a server.
        </p>
        <p className="disclaimer">
          Status: not certified — for preparation and validation only. Rules trace to the official
          OpenPeppol PINT AE Billing v1.0.3 specification.
        </p>
      </header>

      <section className="toolbar">
        <button type="button" onClick={onValidate} className="primary">
          Validate
        </button>
        <button type="button" onClick={() => fileInput.current?.click()}>
          Upload XML…
        </button>
        <button type="button" onClick={onSample}>
          Load sample
        </button>
        <button type="button" onClick={onClear}>
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
        placeholder="Paste UBL Invoice or CreditNote XML here, or click “Load sample”."
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
                  ? `✓ Valid — ${warnings.length} warning(s).`
                  : `✗ Invalid — ${errors.length} error(s), ${warnings.length} warning(s).`}
              </div>
              {result.messages.length > 0 && (
                <ul className="messages">
                  {result.messages.map((m, i) => (
                    <li key={i} className={m.severity}>
                      <code className="rule">{m.ruleId}</code>
                      <code className="path">{m.path}</code>
                      <span className="msg">{m.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}

      <footer>
        <a href="https://github.com/FarshadAbolfathi/pint-ae">source on GitHub</a>
      </footer>
    </main>
  );
}
