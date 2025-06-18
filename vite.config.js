import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.wasm', '**/*.onnx'],
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  server: {
    fs: {
      allow: ['.'],
    },
  },
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: {
          'onnxruntime-web': ['onnxruntime-web'],
        },
      },
    },
  },
});