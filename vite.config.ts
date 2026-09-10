import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { VitePWA } from "vite-plugin-pwa";

// Две цели сборки из одних исходников:
//   npm run build        -> dist/        обычный сайт + PWA (установка, офлайн, авто-обновление)
//   npm run build:single -> dist-single/ один самодостаточный .html (флешка, e-mail, офлайн-показ)
//
// PWA-плагин включается только для обычной сборки: service worker и однофайловая
// сборка несовместимы (SW должен жить отдельным файлом с собственным scope).
export default defineConfig(({ mode }) => {
  const single = mode === "single";
  return {
    base: "./",
    plugins: single
      ? [viteSingleFile()]
      : [
          VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["icon.svg"],
            manifest: {
              name: "Terminal Ops Academy",
              short_name: "OpsAcademy",
              description: "Тренажёр DevOps: от первой команды в терминале до дежурства по проду.",
              lang: "ru",
              start_url: "./",
              scope: "./",
              display: "standalone",
              orientation: "portrait-primary",
              background_color: "#0b0e14",
              theme_color: "#121724",
              icons: [
                { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
                { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
              ],
            },
            workbox: {
              globPatterns: ["**/*.{js,css,html,svg,woff2}"],
              navigateFallback: "index.html",
              cleanupOutdatedCaches: true,
            },
          }),
        ],
    build: {
      outDir: single ? "dist-single" : "dist",
      emptyOutDir: true,
      target: "es2020",
      sourcemap: false,
    },
  };
});
