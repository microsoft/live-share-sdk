import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        preserveSymlinks: true,
    },
    server: {
        port: 3000,
        open: true,
    },
    optimizeDeps: {
        force: true,
    },
    assetsInclude: ["**/*.glb"],
});
