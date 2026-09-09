import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Две цели сборки из одних исходников:
//   npm run build        -> dist/        обычный статический сайт (Pages, Netlify, любой хостинг)
//   npm run build:single -> dist-single/ один самодостаточный .html, работает с флешки и офлайн
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: mode === "single" ? [viteSingleFile()] : [],
  build: {
    outDir: mode === "single" ? "dist-single" : "dist",
    emptyOutDir: true,
    target: "es2020",
  },
}));
