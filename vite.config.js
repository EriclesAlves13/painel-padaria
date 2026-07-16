import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANTE: troque "painel-padaria" abaixo pelo nome exato do seu repositório
// no GitHub, caso vá publicar no GitHub Pages (ex: usuario.github.io/NOME-DO-REPO/).
// Se for publicar na Vercel ou Netlify, pode deixar base: "/".
export default defineConfig({
  plugins: [react()],
  base: "/painel-padaria/",
});
