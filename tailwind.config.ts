import type { Config } from "tailwindcss";

export default <Partial<Config>>{
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Đồng bộ màu primary từ nuxt.config.ts của anh
        primary: "#065f46",
      },
      fontFamily: {
        // Đồng bộ Font SF Pro Display và thêm Outfit đang dùng trong dự án
        sans: [
          '"SF Pro Display"',
          "Outfit",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        outfit: ["Outfit", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  content: [
    "./app/**/*.{vue,js,ts,jsx,tsx}",
    "./layouts/**/*.{vue,js,ts,jsx,tsx}",
    "./pages/**/*.{vue,js,ts,jsx,tsx}",
    "./components/**/*.{vue,js,ts,jsx,tsx}",
    "./plugins/**/*.{js,ts}",
    "./nuxt.config.{js,ts}",
  ],
};
