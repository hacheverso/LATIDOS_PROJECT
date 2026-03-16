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
        hover: "var(--bg-hover)",
        input: "var(--input-bg)",
        header: "var(--bg-header)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
        inverse: "var(--text-inverse)",
        border: "var(--border-color)",
        brand: "var(--brand-electric)",
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
      },
      fontSize: {
        // Typography Scale — fixed sizes for consistent hierarchy
        "kpi":         ["2rem",   { lineHeight: "1",    fontWeight: "900", letterSpacing: "-0.02em" }],
        "heading":     ["1.75rem", { lineHeight: "1.1",  fontWeight: "900", letterSpacing: "-0.03em" }],
        "subheading":  ["1.125rem", { lineHeight: "1.2", fontWeight: "700", letterSpacing: "-0.01em" }],
      }
    },
  },
  plugins: [],
};
export default config;
