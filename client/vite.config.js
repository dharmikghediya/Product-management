import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_URL || "http://127.0.0.1:3000";

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/ws": {
          target: apiTarget,
          ws: true,
          changeOrigin: true,
        },
        "/auth": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/product": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/users": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/orders": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/stock-movements": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
