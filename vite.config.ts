import tailwindcss from "/node_modules/@tailwindcss/vite/dist/index.mjs?v=17b4195c";
import react from "/node_modules/.vite/deps/@vitejs_plugin-react.js?v=b1b6c4dd";
import path from "/@id/__vite-browser-external:path";
import { defineConfig } from "/node_modules/.vite/deps/vite.js?v=0083977f";
export default defineConfig(() => {
  return {
    base: "./",
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      exclude: ["@tailwindcss/vite", "@tailwindcss/oxide"],
      entries: ["index.html", "src/**/*.{ts,tsx}"]
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, ".")
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === "true" ? null : {}
    }
  };
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZpdGUuY29uZmlnLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2RlZmluZUNvbmZpZ30gZnJvbSAndml0ZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoKSA9PiB7XG4gIHJldHVybiB7XG4gICAgYmFzZTogJy4vJyxcbiAgICBwbHVnaW5zOiBbcmVhY3QoKSwgdGFpbHdpbmRjc3MoKV0sXG4gICAgb3B0aW1pemVEZXBzOiB7XG4gICAgICBleGNsdWRlOiBbJ0B0YWlsd2luZGNzcy92aXRlJywgJ0B0YWlsd2luZGNzcy9veGlkZSddLFxuICAgICAgZW50cmllczogWydpbmRleC5odG1sJywgJ3NyYy8qKi8qLnt0cyx0c3h9J10sXG4gICAgfSxcbiAgICByZXNvbHZlOiB7XG4gICAgICBhbGlhczoge1xuICAgICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuJyksXG4gICAgICB9LFxuICAgIH0sXG4gICAgc2VydmVyOiB7XG4gICAgICAvLyBITVIgaXMgZGlzYWJsZWQgaW4gQUkgU3R1ZGlvIHZpYSBESVNBQkxFX0hNUiBlbnYgdmFyLlxuICAgICAgLy8gRG8gbm90IG1vZGlmecOiwoDClGZpbGUgd2F0Y2hpbmcgaXMgZGlzYWJsZWQgdG8gcHJldmVudCBmbGlja2VyaW5nIGR1cmluZyBhZ2VudCBlZGl0cy5cbiAgICAgIGhtcjogcHJvY2Vzcy5lbnYuRElTQUJMRV9ITVIgIT09ICd0cnVlJyxcbiAgICAgIC8vIERpc2FibGUgZmlsZSB3YXRjaGluZyB3aGVuIERJU0FCTEVfSE1SIGlzIHRydWUgdG8gc2F2ZSBDUFUgZHVyaW5nIGFnZW50IGVkaXRzLlxuICAgICAgd2F0Y2g6IHByb2Nlc3MuZW52LkRJU0FCTEVfSE1SID09PSAndHJ1ZScgPyBudWxsIDoge30sXG4gICAgfSxcbiAgfTtcbn0pO1xuIl0sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLGlCQUFpQjtBQUN4QixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVEsb0JBQW1CO0FBRTNCLGVBQWUsYUFBYSxNQUFNO0FBQ2hDLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLFNBQVMsQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDO0FBQUEsSUFDaEMsY0FBYztBQUFBLE1BQ1osU0FBUyxDQUFDLHFCQUFxQixvQkFBb0I7QUFBQSxNQUNuRCxTQUFTLENBQUMsY0FBYyxtQkFBbUI7QUFBQSxJQUM3QztBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsV0FBVyxHQUFHO0FBQUEsTUFDbEM7QUFBQSxJQUNGO0FBQUEsSUFDQSxRQUFRO0FBQUE7QUFBQTtBQUFBLE1BR04sS0FBSyxRQUFRLElBQUksZ0JBQWdCO0FBQUE7QUFBQSxNQUVqQyxPQUFPLFFBQVEsSUFBSSxnQkFBZ0IsU0FBUyxPQUFPLENBQUM7QUFBQSxJQUN0RDtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsIm5hbWVzIjpbXX0=