# GEMINI.md - Context & Instructions

This file serves as a comprehensive guide for AI agents (Gemini) interacting with the **FE Lab** project. It outlines the project structure, technical stack, development conventions, and operational workflows.

## 🌍 **Project Overview**

**FE Lab** is a **frontend experimentation monorepo** designed to explore architecture, design patterns, and new technologies in a practical, production-oriented context. It uses **Turborepo** for build orchestration and **pnpm workspaces** for dependency management.

### **Core Objectives**
*   **Architecture Research:** Implementing DDD (Domain-Driven Design) and Clean Architecture in frontend.
*   **Tech Comparison:** Experimenting with Next.js App Router, React 19 (Canary), and Vite.
*   **Type Safety:** leveraging TypeScript for robust domain modeling and API design.
*   **Styling:** utilizing **Panda CSS** as a modern, performance-focused styling solution.

---

## 🏗️ **Technical Stack**

*   **Monorepo Tooling:** [Turborepo](https://turbo.build/), [pnpm](https://pnpm.io/) (Workspaces)
*   **Package Manager:** `pnpm` (v10.10.0 enforced)
*   **Languages:** TypeScript (v5.8.3), JavaScript
*   **Frameworks & Runtimes:**
    *   **Next.js 15+** (App Router)
    *   **React 19** (Canary)
    *   **Vite**
    *   **Node.js** (>= 20)
*   **Styling:** [Panda CSS](https://panda-css.com/)
*   **Testing:** Jest, Vitest, React Testing Library, MSW (Mock Service Worker)

---

## 📂 **Project Structure**

### **Applications (`apps/`)**

| Directory | Description | Tech Stack |
| :--- | :--- | :--- |
| `apps/next.js/` | Server Component & Architecture experiments | Next.js (App Router), Turbopack |
| `apps/react/` | SPA experiments, Design System consumer | React 19, Vite, Vitest |
| `apps/typescript/` | Pure TS domain modeling & patterns | TypeScript |
| `apps/blog/web/` | Tech blog frontend | Next.js, Custom MDX, Supabase |
| `apps/blog/posts/` | Markdown content for the blog | Markdown |
| `apps/ga-proxy/` | Google Analytics Proxy | Next.js |
| `apps/socket-server/` | WebSocket experiment server | Node.js |

### **Shared Packages (`packages/`)**

| Directory | Description |
| :--- | :--- |
| `packages/@design-system/ui` | Shared UI components (React) |
| `packages/@design-system/ui-lib` | Styling utilities & primitives (Panda CSS) |
| `packages/@package/bundler` | Custom bundler implementation experiments |
| `packages/@package/bundler-playground` | Playground for custom bundler |
| `packages/@package/core` | Core utilities, HTTP clients, constants |
| `packages/@package/config` | Shared configurations (TSConfig, etc.) |

---

## 🛠️ **Development Workflow**

### **Key Commands**

Run these commands from the **root directory**:

*   **Install Dependencies:**
    ```bash
    pnpm install
    ```
*   **Start All Dev Servers:**
    ```bash
    pnpm dev
    ```
*   **Run Specific App:**
    ```bash
    pnpm react       # Start apps/react
    pnpm next        # Start apps/next.js
    pnpm typescript  # Start apps/typescript
    pnpm blog-web    # Start apps/blog/web
    ```
*   **Build All:**
    ```bash
    pnpm build
    ```
*   **Test & Lint:**
    ```bash
    pnpm test        # Run all tests
    pnpm lint        # Run linter
    pnpm check-types # Run TypeScript type checking
    ```

### **Architecture & Conventions**

1.  **Strict Type Safety:**
    *   All codebases must pass strict TypeScript checks.
    *   Run `pnpm check-types` to verify type integrity across the monorepo.

2.  **Component Design:**
    *   UI components reside in `@design-system/ui` when shared.
    *   Styles should primarily use **Panda CSS**.

3.  **Dependency Management:**
    *   Dependencies are managed via `pnpm-workspace.yaml`.
    *   **Catalogs** (`react19`, `typescript5`) are defined in `pnpm-workspace.yaml` to ensure version consistency across apps.

4.  **Testing Strategy:**
    *   **Vitest** for unit/integration tests in Vite projects (`apps/react`).
    *   **Jest** for Next.js projects (`apps/next.js`).
    *   **MSW** for API mocking in tests and development.

---

## 🤖 **Context for AI Agents**

*   **When adding a new feature:** Check if logic belongs in a shared package (`packages/`) or remains app-specific.
*   **When refactoring:** Ensure changes align with the DDD/Clean Architecture principles favored in this repo.
*   **When debugging:** Use `pnpm <app-name>` scripts to isolate the environment.
*   **Blog Content:** Blog posts are located in `apps/blog/posts/`. When editing or analyzing posts, refer to the directory structure there.

This file should be the **first point of reference** for understanding the project state and capabilities.