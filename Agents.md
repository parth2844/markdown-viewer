# Agent Directives for Markdown Viewer

This file contains standard operating procedures (SOPs), architectural context, and strict rules to guide any AI Agent working on this repository.

## 1. Project Context
*   **Purpose**: A modern, feature-rich, side-by-side Markdown Viewer application.
*   **Tech Stack**: React 18, Vite, TypeScript.
*   **Core Dependencies**: `react-markdown`, `remark-gfm` (for tables/lists), `rehype-katex` (for math equations), and `mermaid` (for dynamic diagrams).

## 2. Architectural Guidelines & Styling
*   **Tailwind CSS v4 & Nord Theme**: The application's styling architecture is strictly driven by Tailwind CSS v4. Do NOT use standard default Tailwind colors; we have globally overridden the palette with the official **Nord Theme** (`--color-nord0` through `--color-nord15`) to control UI states natively.
*   **Layout Paradigm (Option 2 Workspace)**: The app uses a "Fixed Left Sidebar" layout. The permanent `.sidebar` container strictly holds global app branding, navigation, and file lists. The `.workspace` pane holds the document-scoped `NavBar` and the actual split-editor panes.
*   **TypeScript Conventions**: All new components must have strongly-typed `Props` interfaces. Avoid using `any` unless absolutely necessary.
*   **Component Structure**: Keep all React components inside `src/components/`. Name files `ComponentName.tsx` and prefer utilizing Tailwind utility classes inline whenever possible instead of polluting `.css` files with non-reusable layout logic.

## 3. Workflows & Verification
If you are an AI agent modifying this codebase, you must follow these verification steps:
1. **Theming**: Always mentally verify your UI changes against both Light and Dark mode variables defined in `src/index.css`.
2. **Build Checks**: Before declaring a feature complete or pushing changes, you MUST run `npm run build` locally to verify there are no hidden TypeScript compilation errors (ignoring `React is not defined` warnings if on React 17+ JSX transform).
3. **Print Emulation**: Ensure that any new UI navigation elements are explicitly hidden via the `.no-print` class or inside the `@media print` CSS blocks so they do not ruin the PDF export feature.

## 4. Agent Execution Paths
For complex, multi-step CLI automation (like automated deployments or extensive testing routines), create explicit workflow configurations in the `.agents/workflows/` directory. Annotated steps (like `// turbo`) will trigger safe, auto-run privileges for the Agent.

## 5. Technical Decisions Context
*   **Markdown Pipeline**: We use `react-markdown` alongside `remark-gfm` (for tables/task lists), `remark-math` & `rehype-katex` (for formulas), and `mermaid`. This modular plugin architecture avoids monolithic parser bloat while natively supporting high-end developer constructs.
*   **Syntax Highlighting**: We use `react-syntax-highlighter` (Prism). It is explicitly coded to dynamically swap between the `nord` theme (in Dark mode) and the bright `vs` theme (in Light mode) so code blocks remain perfectly legible at all times.
*   **Raw Content Imports**: The default markdown content is isolated in `src/assets/default.md` and imported using Vite's `?raw` import tag (`import content from './assets/default.md?raw'`). This deliberately ensures we don't pollute `.tsx` logic with massive multi-line template literals or escape-sequence hacks.
*   **Print Fidelity**: PDF layout is governed directly via `@media print`. It explicitly strips UI elements (`.no-print`) and enforces `page-break-inside: avoid` on charts, images, and tables for pristine documentation generation.

## 6. GitHub Repository & Auto-Deployment
*   **Remote URL**: `https://github.com/parth2844/markdown-viewer`
*   **CI/CD Pipeline**: The project relies on an automated GitHub Actions workflow (`.github/workflows/deploy.yml`) to build and push the production bundle seamlessly to **GitHub Pages**. 
*   **Vite Configuration**: To support the GitHub Pages subpath environment, `vite.config.ts` is explicitly configured with `base: '/markdown-viewer/'`. **Do not** remove this base URL path unless migrating away from GitHub Pages.
