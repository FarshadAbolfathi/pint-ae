/** Minimal ambient types for the `saxon-js` runtime (it ships no types). */
declare module 'saxon-js' {
  interface TransformOptions {
    stylesheetInternal?: unknown;
    stylesheetText?: string;
    stylesheetFileName?: string;
    stylesheetLocation?: string;
    sourceText?: string;
    sourceFileName?: string;
    destination?: 'serialized' | 'document' | 'application' | 'raw';
  }
  interface TransformResult {
    principalResult: string;
  }
  export function transform(options: TransformOptions, execMode: 'sync'): TransformResult;
  export function transform(options: TransformOptions, execMode: 'async'): Promise<TransformResult>;
  const SaxonJS: {
    transform: typeof transform;
  };
  export default SaxonJS;
}
