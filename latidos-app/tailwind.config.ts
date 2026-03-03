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
        card: "var(--bg-card)",
        input: "var(--input-bg)",
        primary: "var(--text-primary)",
        muted: "var(--text-muted)",
        border: "var(--border-color)",
        success: "var(--color-success)",
        transfer: "var(--color-transfer)",
        debt: "var(--color-debt)",
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
