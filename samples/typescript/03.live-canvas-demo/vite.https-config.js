import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        outDir: "../dist",
    },
    plugins: [react()],
    resolve: {
        preserveSymlinks: true,
    },
    root: "./src",
    server: {
        hmr: {
            // Needed to make ngrok work with Vite
            clientPort: 443,
        },
        port: 3000,
        open: true,
    },
    optimizeDeps: {
        force: true,
    },
});
