// FE Lab — Warm journal tokens, extending the existing ink/accent palette
window.TOKENS = {
  // Paper-warm neutrals (shift hue from cool 250 → warm 70)
  paper: {
    50: 'oklch(98.5% 0.008 75)',  // warmest paper
    100: 'oklch(96% 0.012 75)',
    200: 'oklch(92% 0.014 75)',
    300: 'oklch(86% 0.014 75)',
  },
  ink: {
    950: 'oklch(16% 0.018 60)',   // near black, warm
    900: 'oklch(22% 0.02 60)',
    800: 'oklch(30% 0.022 60)',
    700: 'oklch(40% 0.022 60)',
    600: 'oklch(50% 0.02 60)',
    500: 'oklch(60% 0.018 60)',
    400: 'oklch(70% 0.014 60)',
    300: 'oklch(80% 0.012 70)',
    200: 'oklch(88% 0.012 75)',
    border: 'oklch(86% 0.014 75)',
    borderStrong: 'oklch(72% 0.018 70)',
  },
  // From original blog-preset, keep blue accent
  accent: {
    50:  'oklch(96.5% 0.022 255)',
    200: 'oklch(84% 0.05 255)',
    600: 'oklch(53% 0.22 255)',
    700: 'oklch(47% 0.24 255)',
  },
  // Warm secondary — for highlights, series tags, demo embeds
  marker: {
    100: 'oklch(95% 0.06 90)',    // soft highlighter
    300: 'oklch(89% 0.14 90)',    // strong highlighter
    600: 'oklch(60% 0.16 65)',    // ochre text
  },
  // Forest — for "now reading" / live demo accents
  moss: {
    100: 'oklch(94% 0.04 145)',
    600: 'oklch(45% 0.12 145)',
  },
};

// Inject @import + CSS vars
const T = window.TOKENS;
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..700&family=Noto+Serif+KR:wght@300;400;500;600;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap');
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');

  :root {
    --paper-50: ${T.paper[50]};
    --paper-100: ${T.paper[100]};
    --paper-200: ${T.paper[200]};
    --paper-300: ${T.paper[300]};
    --ink-950: ${T.ink[950]};
    --ink-900: ${T.ink[900]};
    --ink-800: ${T.ink[800]};
    --ink-700: ${T.ink[700]};
    --ink-600: ${T.ink[600]};
    --ink-500: ${T.ink[500]};
    --ink-400: ${T.ink[400]};
    --ink-300: ${T.ink[300]};
    --ink-200: ${T.ink[200]};
    --ink-border: ${T.ink.border};
    --ink-border-strong: ${T.ink.borderStrong};
    --accent-50: ${T.accent[50]};
    --accent-200: ${T.accent[200]};
    --accent-600: ${T.accent[600]};
    --accent-700: ${T.accent[700]};
    --marker-100: ${T.marker[100]};
    --marker-300: ${T.marker[300]};
    --marker-600: ${T.marker[600]};
    --moss-100: ${T.moss[100]};
    --moss-600: ${T.moss[600]};

    --font-serif: 'Noto Serif KR', 'Newsreader', Georgia, serif;
    --font-serif-en: 'Newsreader', 'Noto Serif KR', Georgia, serif;
    --font-sans: Pretendard, -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", "Apple SD Gothic Neo", sans-serif;
    --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  /* Scoped reset for artboards */
  .felab {
    font-family: var(--font-sans);
    color: var(--ink-950);
    background: var(--paper-50);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    word-break: keep-all;
  }
  .felab *, .felab *::before, .felab *::after {
    box-sizing: border-box;
  }
  .felab h1, .felab h2, .felab h3, .felab h4 {
    font-family: var(--font-serif);
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 1.15;
    margin: 0;
  }
  .felab p { margin: 0; line-height: 1.7; }
  .felab a { color: inherit; text-decoration: none; }
  .felab button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; padding: 0; }
  .felab ::selection { background: var(--marker-300); color: var(--ink-950); }

  .felab .mono { font-family: var(--font-mono); font-feature-settings: 'ss02', 'cv11'; }
  .felab .serif { font-family: var(--font-serif); }
  .felab .label {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-500);
  }
  .felab .marker {
    background: linear-gradient(180deg, transparent 55%, var(--marker-300) 55%, var(--marker-300) 92%, transparent 92%);
    padding: 0 2px;
  }

  /* Scrollbar polish */
  .felab ::-webkit-scrollbar { width: 8px; height: 8px; }
  .felab ::-webkit-scrollbar-thumb { background: var(--ink-200); border-radius: 4px; }
  .felab ::-webkit-scrollbar-thumb:hover { background: var(--ink-300); }
`;
const style = document.createElement('style');
style.id = '__felab_tokens';
style.textContent = css;
document.head.appendChild(style);
