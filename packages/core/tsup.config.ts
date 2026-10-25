import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  // `composite`/`incremental` (needed by `tsc --build` for project references)
  // make the dts program reject files not explicitly listed; disable them here.
  dts: { compilerOptions: { composite: false, incremental: false } },
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'node20',
});
