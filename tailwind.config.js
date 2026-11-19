/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/routes/admin-registry.tsx",
    "./src/features/admin/registry/**/*.{ts,tsx}",
    "./src/features/admin/components/Registry*",
  ],
  theme: {
    extend: {
      colors: {
        oasis: {
          bg: "var(--oasis-bg)",
          surface: "var(--oasis-surface)",
          raised: "var(--oasis-surface-raised)",
          border: "var(--oasis-border)",
          text: "var(--oasis-text)",
          secondary: "var(--oasis-text-secondary)",
          muted: "var(--oasis-text-muted)",
          accent: "var(--oasis-accent)",
        },
      },
      fontFamily: {
        display: ["var(--oasis-font-display)"],
        body: ["var(--oasis-font-body)"],
        mono: ["var(--oasis-font-mono)"],
      },
      borderRadius: {
        "oasis-sm": "var(--oasis-radius-sm)",
        "oasis-md": "var(--oasis-radius-md)",
        "oasis-lg": "var(--oasis-radius-lg)",
      },
    },
  },
  plugins: [],
};
