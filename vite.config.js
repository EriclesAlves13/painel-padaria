import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANTE:
// - Se for publicar na Vercel ou Netlify, deixe base: "/" (é o padrão abaixo).
// - Se for publicar no GitHub Pages, troque para "/NOME-DO-REPOSITORIO/".
export default defineConfig({
  plugins: [react()],
  base: "/",
});
