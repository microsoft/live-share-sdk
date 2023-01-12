import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        preserveSymlinks: true,
    },
    server: {
        hmr: {
            // Needed to make ngrok work with Vite
            clientPort: 443,
        },
        port: 3000,
    },
});
