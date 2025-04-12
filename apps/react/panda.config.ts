import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  presets: ["@pandacss/dev/presets"],
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@design-system/ui/src/**/*.{js,jsx,ts,tsx}",
  ],

  // Files to exclude
  exclude: [],

  // Useful for theme customization
  theme: {
    extend: {},
  },
  jsxFramework: "react",

  // The output directory for your css system
  outdir: "../../packages/design-system/ui-lib",
  importMap: {
    css: "@design-system/ui-lib/css",
    recipes: "@design-system/ui-lib/recipes",
    patterns: "@design-system/ui-lib/patterns",
    jsx: "@design-system/ui-lib/jsx",
  },
});
