// vite.config.js
import { resolve } from 'path';
import { defineConfig } from 'vite';
import inject from "@rollup/plugin-inject";

export default defineConfig({
  plugins: [
      inject({
        $: 'jquery',
        jQuery: 'jquery'
      })
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        nested: resolve(__dirname, 'presenter.html'),
      },
    },
  },
})
