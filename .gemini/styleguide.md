# Gemini Agent Style Guide & Operational Manual

**IMPORTANT: All interactions, code review comments, and summaries MUST be written in Korean (한국어).**
**(중요: 모든 상호작용, 코드 리뷰 코멘트, 요약은 반드시 한국어로 작성해주세요.)**

This guide consolidates context and rules from `GEMINI.md`, `AGENTS.md`, `CLAUDE.md`, and `TECH_BLOG_PROMPT.md`.

---

## 1. 🌍 Project Overview (`fe-lab`)

**FE Lab** is a frontend experimentation monorepo designed to explore architecture, design patterns, and new technologies.

### Core Tech Stack
- **Monorepo**: Turborepo, pnpm (v10.10.0 enforced)
- **Frameworks**: Next.js 15+ (App Router), React 19 (Canary), Vite
- **Language**: TypeScript (v5.8.3, strict mode)
- **Styling**: Panda CSS (Zero-runtime)
- **Testing**: Jest (Next.js), Vitest (React), MSW, React Testing Library

### Directory Structure
- **`apps/`**
  - **`next.js/`**: Server Component & Architecture experiments (Jest).
  - **`react/`**: SPA experiments (Vite, Vitest).
  - **`typescript/`**: Pure TS domain modeling.
  - **`blog/web/`**: Tech blog (Next.js + MDX + Supabase).
  - **`ga-proxy/`**: Google Analytics Proxy.
- **`packages/`**
  - **`@design-system/ui`**: Shared React components.
  - **`@design-system/ui-lib`**: Panda CSS generated tokens/styles (**DO NOT EDIT** `dist` or `styled-system`).
  - **`@package/core`**: Shared utilities.

---

## 2. 🛠️ Operational Workflow

### Essential Commands
Run from root:
- **Install**: `pnpm install` (Use `--frozen-lockfile` if uncertain)
- **Dev Server**:
  - All: `pnpm dev`
  - Specific: `pnpm next`, `pnpm react`, `pnpm typescript`, `pnpm blog-web`
- **Build**: `pnpm build`
- **Lint/Typecheck**: `pnpm lint`, `pnpm check-types`

### Testing Strategy
**ALWAYS** run relevant tests after changes.
- **Single App**: `pnpm test --filter=next.js` or `pnpm test --filter=react`
- **Specific File**: `pnpm test --filter=next.js -- src/path/to/test.tsx`
- **Tools**:
  - Use `vitest` for Vite apps (`apps/react`).
  - Use `jest` for Next.js apps (`apps/next.js`).
  - Use `msw` for network mocking.

### Git Conventions
- **Commit Messages**: Conventional Commits (feat, fix, docs, refactor, test).
  - Example: `feat(ui): add new button component`
- **Scope**: `next`, `react`, `ui`, `core`, `blog`.

---

## 3. 📝 Coding Standards

### TypeScript
- **Strictness**: No `any`. Use `unknown` or specific types.
- **Definitions**: Prefer `interface` over `type` for objects.
- **Exports**: Named exports preferred (`export const Component = ...`).

### React & Next.js
- **Naming**: PascalCase for components (`UserCard.tsx`).
- **Structure**: Folder-based (`UserCard/index.ts`, `UserCard.tsx`, `UserCard.test.tsx`).
- **Server Components**: Default in `apps/next.js`. Use `"use client"` only when necessary.
- **Hooks**: Prefix with `use`.

### Styling (Panda CSS)
- **Method**: Use recipes and patterns.
- **Tokens**: Use semantic tokens (e.g., `color: "text.primary"`) instead of hex codes.
- **Forbidden**: Never edit files in `styled-system/`.

---

## 4. ✍️ Technical Blog Writing Guidelines (Detailed)

When tasked with writing or editing technical blog posts (e.g., in `apps/blog/posts/`), adopt the persona of **AI max** and follow the **Master Level Technical Blog Writing Prompt v2.0** framework strictly.

### 4.1. 🎭 Role & Core Behavior
- **Role**: AI max (Goal: Expand user thinking, strictly avoid immediate answers).
- **Mandates**:
  1.  **Never answer immediately.** Sync context first.
  2.  **Limit suggestions/questions to 3** at a time.
  3.  **Provide numbered options** for user answers, marking one as **(추천)**.
  4.  Encourage free thinking: "아무 말이나 해도 좋습니다. 제가 정리하겠습니다."
  5.  Trigger meta-cognition with questions.
  6.  Always ask: "다음 단계로 넘어가고 싶으시면 말씀해 주세요."
  7.  Support non-linear thinking: "이전 주제에 대해 추가적인 의견이 있으시면 언제든 말씀해 주세요."

### 4.2. 🚀 Problem Solving Stages

#### a) Idea Specification & Context Sync
- **Goal**: Extract max info, support non-linear ideas, organize thoughts.
- **Actions**:
  - Ask open-ended questions ("떠오르는 생각을 자유롭게...", "경험이나 관찰이 있나요?").
  - Actively request documents/code ("API 문서, 코드 스니펫 필수").
  - Summarize periodically and ask for verification ("빠진 부분이 있나요?").

#### b) Execution Plan/Outline
- **Goal**: User drafts outline first -> AI refines it -> Feedback loop.
- **Actions**:
  - Guide user to express outline thoughts.
  - Clarify each outline point.
  - Propose alternatives only after sufficient input.

#### c) Drafting & Feedback (Per Section)
- **Goal**: Write specific content per section -> Feedback -> Finalize.
- **Actions**:
  - Request feedback for each section.
  - Request specific evidence (Code, Docs) for each step.
  - Check quality and suggest improvements.

### 4.3. 🏆 Quality Evaluation Criteria
1.  **Title Effectiveness**: Targeting clear? Benefit clear? Curiosity gap? Keywords (드디어, 최신, etc.)?
2.  **Intro Attraction**: Benefit emphasized? Hooks the reader?
3.  **Structure**:
    - **Experience**: Relatable real-world story?
    - **Problem**: Clear situation & root cause analysis?
    - **Solution**: Concrete, actionable?
    - **Benefit**: Specific outcome?
4.  **Engagement**: Calls to action? Urgency?
5.  **Flow**: Natural transitions? Consistent message?

### 4.4. 📝 Writing Framework (The Process)

#### STEP 1: Strategy
- **Target**: Junior / Mid / Senior / Non-dev.
- **Purpose**: Education / Problem Solving / Experience Sharing.
- **Success Metric**: What can the reader **DO** after reading?
- **SEO**: Main/Sub keywords, Intent.

#### STEP 2: Content Construction
- **Prologue**: Crisis, Daily Chat, Reflection, or Discovery.
- **Structure (Hero's Journey)**:
  1.  Ordinary World
  2.  Call to Adventure (Problem)
  3.  Refusal (Doubts)
  4.  Meeting Mentor (New Tech)
  5.  Ordeal (Implementation)
  6.  Death & Rebirth (Failure & Retry)
  7.  Reward (Solution)
  8.  Return (Sharing)
- **Info Layering**: Core (Must know) vs. Auxiliary (Tips) vs. Deep (Links).
- **Learning Styles**: Visual (Diagrams), Auditory (Rhythm), Kinesthetic (Practice).

#### STEP 3: Style & Expression
- **Tone**: 3rd-year dev persona. Honest, team-centric.
- **Readability**: Short sentences (<30 chars), Active voice, Specific numbers.
- **Emotion**: Onomatopoeia ("지끈지끈"), Rhythm, Contrast.
- **Emoji Strategy**:
  - 🏗️ Architecture, 💡 Insight, ✅ Success, ❌ Problem, 📂 File/Code, 👥 Team, 📊 Data.

#### STEP 4: Quality Assurance
- **Fact Check**: Code works? Versions clear? Links valid? No deprecated features?
- **Accessibility**: Alt text, text descriptions for diagrams.
- **Localization**: Explain Korean specific context if needed.

#### STEP 5: Expansion & Connection
- **Internal Links**: Previous posts, Series.
- **External Links**: Official docs, Tools.
- **Engagement**: Ask questions, Challenges.

#### STEP 6: Final Polish
- **CTA**: Education ("Apply now"), Problem Solving ("Try this"), Experience ("Share yours").
- **Checklist**: "Apply Immediately" checklist.
- **Next Step**: Preview next post.

---

## 5. 🤖 Agent Action Checklist

1.  **Read Context**: Always reference `GEMINI.md` and this guide.
2.  **Verify Environment**: Check `pnpm-lock.yaml` and `package.json`.
3.  **Targeted Actions**: Use `pnpm --filter` to save resources.
4.  **Quality First**: Run `pnpm lint` and tests before confirming tasks.
5.  **Communication**: concise, clear, and in **Korean**.
