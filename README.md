# Project Mochi

Koustubh’s personal portfolio. The responsive pastel foundation now includes Mochi, a procedural 3D robot in the Hero section (Phase 2A).

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
- `src/components/mascot/MochiScene.tsx`: transparent Canvas, soft lights, HTML interaction control, visibility handling, and context-loss fallback.
- `src/components/mascot/MochiRobot.tsx`: procedural rounded robot with exactly one centered wheel, long articulated arms, and expressive eyes.
- `src/components/mascot/mochiAnimation.ts` and `useMochiAnimation.ts`: deterministic state controller and ref-based frame updates.
- `src/components/mascot/MochiFallback.tsx` and `MochiScene.css`: loading/error fallback and styles contained within the existing Hero scene.
- `tests/mochiAnimation.test.ts`: motion-state, wheel, blending, reduced-motion, and frame-rate checks.
- `src/components/SectionHeading.tsx`: consistent numbered section headings.
- `src/components/Reveal.tsx`: introductory Motion reveals; honors the OS reduced-motion preference.
- `src/components/Icon.tsx`: small shared decorative SVG icons.
- `src/index.css`: Tailwind import, palette, typography, global accessibility styles.
- `src/App.css`: section layouts, cards, interactions, responsive breakpoints.
- `vite.config.ts`: React and Tailwind CSS Vite plugins.
- `public/mochi-mark.svg`: portfolio monogram favicon, not a mascot.

Nunito headings and DM Sans body text load through Google Fonts with local sans-serif fallbacks. Tailwind uses the Vite plugin and CSS-first `@theme` tokens; no legacy PostCSS configuration is needed.

## Phase 2A boundaries

- The existing `.mochi-scene` now contains a lazy-loaded Three.js / React Three Fiber scene. Mochi has exactly one small wheel; its side hub caps belong to the same axle. All geometry is procedural, with no external models or textures.
- A welcome roll, a hesitant wave, idle breathing/blinking/balancing, hover/focus curiosity, and alternating happy/shy click reactions share one controller. Wheel rotation follows displacement; balance tilts around the axle without a physics engine.
- The HTML “Say hello to Mochi” button supports mouse, touch, Enter, and Space. Reduced motion uses a static scene with input-driven poses. Rendering pauses offscreen and when the document is hidden; device pixel ratio is capped at 1.5. No expensive shadows or post-processing are used.
- Questoriaa is the only featured project. Its screenshot is explicitly marked as a placeholder.
- Contact details are pending. No invented email address, social profile, GitHub URL, form submission, or backend is included.
- No drifting car, audio, games, site-wide mascot navigation, router, database, or backend services are included.

## Validation

`npm run typecheck` checks the application and Vite configuration. `npm run build` also runs TypeScript before creating production assets in `dist/`.

`npm run lint` runs the existing Oxlint configuration. The `.gitignore` excludes dependencies, build output, environment files (except sanitized `.env.example` files), caches, logs, and the local review ZIP.

For browser review, check desktop, tablet, and 320–390px mobile widths; mobile menu open/close and Escape; section anchor links; keyboard focus and skip link; and OS reduced-motion settings.

Run the mascot controller tests with `node --test tests/mochiAnimation.test.ts` (Node 22.18+ or 24). These verify motion logic without a GPU; they do not replace browser rendering or performance checks. Also check the welcome roll, the single visible wheel, arm joints, expressions, keyboard/touch controls, reduced motion, and WebGL/context-loss fallback in a browser. The lazy 3D chunk currently exceeds Vite’s 500 kB warning threshold; it is separate from the initial page bundle.
