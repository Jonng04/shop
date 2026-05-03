// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  runtimeConfig: {
    session: {
      maxAge: 60 * 60 * 24, // 1 day
    },
    socketIo: {
      host: "0.0.0.0",
      port: 3031,
      path: "/socket.io",
    },
    public: {
      socketIoUrl: "",
      socketIoPort: 3031,
      socketIoPath: "/socket.io",
      siteUrl: process.env.SITE_URL || "http://localhost:3000",
    },
  },
  nitro: {
    routeRules: {
      "/sitemap.xml": { cache: { maxAge: 60 * 60 } }, // Cache 1 hour
      "/robots.txt": { cache: { maxAge: 60 * 60 * 24 } }, // Cache 24 hours
    },
  },
  app: {
    head: {
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
        },
      ],
    },
  },
  css: ["~/assets/css/global.css"],
  modules: [
    "@nuxtjs/tailwindcss",
    "@nuxt/icon",
    "nuxt-auth-utils",
    "@nuxtjs/color-mode",
    "@nuxtjs/turnstile",
  ],
  colorMode: {
    classSuffix: "",
    preference: "light",
    fallback: "light",
  },
  tailwindcss: {
    config: {
      theme: {
        extend: {
          colors: {
            primary: "#065f46",
          },
          fontFamily: {
            sans: ["Montserrat", "sans-serif"],
            mono: ['"JetBrains Mono"', "monospace"],
          },
        },
      },
      safelist: [
        // Grid col-span: tránh bị mất khi tạo file mới giữa session
        "col-span-1",
        "col-span-2",
        "col-span-3",
        "col-span-4",
        "col-span-5",
        "col-span-6",
        "col-span-7",
        "col-span-8",
        "col-span-9",
        "col-span-10",
        "lg:col-span-1",
        "lg:col-span-2",
        "lg:col-span-3",
        "lg:col-span-4",
        "lg:col-span-5",
        "lg:col-span-6",
        "lg:col-span-7",
        "lg:col-span-8",
        "lg:col-span-9",
        "lg:col-span-10",
        // Aspect ratios
        "aspect-square",
        "aspect-video",
        "aspect-[4/3]",
      ],
    },
  },
});
