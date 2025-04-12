import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  presets: ["@pandacss/dev/presets", "@design-system/ui/preset"],
  // Whether to use css reset
  preflight: true,
  lightningcss: true,

  // Where to look for your css declarations
  include: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@design-system/ui/src/**/*.{js,jsx,ts,tsx}",
  ],

  jsxFramework: "react",

  strictPropertyValues: true,
  importMap: {
    css: "@design-system/ui-lib/css",
    recipes: "@design-system/ui-lib/recipes",
    patterns: "@design-system/ui-lib/patterns",
    jsx: "@design-system/ui-lib/jsx",
  },
});
