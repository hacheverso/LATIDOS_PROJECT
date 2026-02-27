import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-main)",
        surface: "var(--surface)",
        brand: "var(--brand-primary)",
        foreground: "var(--text-main)",
        muted: "var(--text-muted)",
        success: "var(--accent-success)",
        border: "var(--border)",
      },
      borderRadius: {
        lg: "var(--radius-lg)",
      },
      spacing: {
        std: "var(--gap-std)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
      }
    },
  },
  plugins: [],
};
export default config;
