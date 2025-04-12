import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  presets: ["@pandacss/dev/presets"],
  // Whether to use css reset
  preflight: true,

  // The extension for the emitted JavaScript files
  outExtension: "mjs",
  // Where to look for your css declarations
  include: ["./src/**/*.{js,jsx,ts,tsx}"],

  // Files to exclude
  exclude: [],

  // Useful for theme customization
  theme: {
    extend: {},
  },

  // The output directory for your css system
  outdir: "../ui-lib",
  importMap: {
    css: "@design-system/ui-lib/css",
    recipes: "@design-system/ui-lib/recipes",
    patterns: "@design-system/ui-lib/patterns",
    jsx: "@design-system/ui-lib/jsx",
  },
  // The JSX framework to use
  jsxFramework: "react",

  // The CSS Syntax to use to use
  syntax: "object-literal",
});
