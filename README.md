# Project Mochi

Koustubh’s personal portfolio. Phase 1 establishes a responsive, pastel design and reusable React components, ready for a future interactive Mochi scene.

## Development

```sh
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
npm run preview
```

On Windows PowerShell with restricted script execution, use `npm.cmd` instead of `npm`.

## Structure

- `src/App.tsx`: page composition, reduced-motion configuration, skip link, footer.
- `src/components/Navigation.tsx`: section links, active-section tracking, accessible mobile disclosure menu with Escape support.
- `src/components/sections/`: individual Hero, About, Toolbox, Projects, and Contact components, in page order.
- `src/components/SectionHeading.tsx`: consistent numbered section headings.
- `src/components/Reveal.tsx`: introductory Motion reveals; honors the OS reduced-motion preference.
- `src/components/Icon.tsx`: small shared decorative SVG icons.
- `src/index.css`: Tailwind import, palette, typography, global accessibility styles.
- `src/App.css`: section layouts, cards, interactions, responsive breakpoints.
- `vite.config.ts`: React and Tailwind CSS Vite plugins.
- `public/mochi-mark.svg`: portfolio monogram favicon, not a mascot.

Nunito headings and DM Sans body text load through Google Fonts with local sans-serif fallbacks. Tailwind uses the Vite plugin and CSS-first `@theme` tokens; no legacy PostCSS configuration is needed.

## Phase 1 boundaries

- The hero reserves `.mochi-scene` for a future shy, tiny 3D robot with small wheels and expressive longer arms. The current scene is a labeled spatial placeholder, not a mascot illustration.
- A future dedicated mascot component can replace the `.mochi-scene` placeholder while retaining `.scene-wrapper` and the existing responsive layout. Three.js and React Three Fiber are not installed yet.
- Questoriaa is the only featured project. Its screenshot is explicitly marked as a placeholder.
- Contact details are pending. No invented email address, social profile, GitHub URL, form submission, or backend is included.
- No 3D libraries, drifting car, router, database, or backend services are included.

## Validation

`npm run typecheck` checks the application and Vite configuration. `npm run build` also runs TypeScript before creating production assets in `dist/`.

`npm run lint` runs the existing Oxlint configuration. The `.gitignore` excludes dependencies, build output, environment files (except sanitized `.env.example` files), caches, logs, and the local review ZIP.

For browser review, check desktop, tablet, and 320–390px mobile widths; mobile menu open/close and Escape; section anchor links; keyboard focus and skip link; and OS reduced-motion settings.
