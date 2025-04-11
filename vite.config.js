import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import rollupNodePolyfills from "rollup-plugin-node-polyfills";
import tailwindcss from "@tailwindcss/vite";
import flowbiteReact from "flowbite-react/plugin/vite";

export default defineConfig({
  resolve: {
    alias: {
      events: "events/",
      util: "util/",
      stream: "stream-browserify",
      buffer: "buffer/",
    },
  },
  plugins: [react(), tailwindcss(), flowbiteReact()],
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
          process: true,
        }),
      ],
    },
  },
  build: {
    rollupOptions: {
      plugins: [rollupNodePolyfills()],
    },
  },
});