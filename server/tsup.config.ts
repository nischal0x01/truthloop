import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  tsconfig: './tsconfig.json',
  // Mark React Email + react-dom as external. They ship as CJS and
  // use dynamic `require()` for Node built-ins (e.g. `util`); bundling
  // them into an ESM output throws "Dynamic require of 'util' is not
  // supported" at runtime on Render. Letting Node resolve them at
  // runtime preserves the CJS/ESM interop.
  external: [
    'react',
    'react-dom',
    'react-dom/server',
    'react-dom/server.node',
    '@react-email/components',
    '@react-email/render',
  ],
});
