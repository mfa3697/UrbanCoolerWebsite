import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/landing-page/', // <- anpassen bei User-Page!
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
