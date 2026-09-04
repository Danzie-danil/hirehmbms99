# Implementation Plan: UI Color Palette & Card Contrast Refinement (102)

## Goal Description
Enhance visual depth, hierarchy, and contrast between root page canvas backgrounds and frontend cards/elements using the requested harmonious color palette:
- **`#FBFEFE`**: Crisp card surfaces, bento boxes, elevated widgets, and modal backgrounds.
- **`#1B201E`**: Primary bold typography, stat card titles, and dark-theme root canvas.
- **`#363B39`**: Secondary text, subtle card framing, active button borders, and dark card surfaces.
- **`#7A827B`**: Muted metadata, card borders, subtle dividers, and neutral badge accents.
- **Root Page Canvas**: Soft tinted canvas (`#EFF4F2` in light mode) so `#FBFEFE` cards pop with distinct visual elevation.

---

## Proposed Changes

### 1. [css/index.css](file:///d:/v2%20BMS%20OFFICIAL/css/index.css)
- Update `:root` variables:
  - `--bg-main` / `--background`: Set to `#EFF4F2` (soft canvas background so `#FBFEFE` cards stand out).
  - `--bg-card` / `--surface`: `#FBFEFE` (crisp card surface).
  - `--text-primary`: `#1B201E`.
  - `--text-secondary`: `#363B39`.
  - `--text-muted`: `#7A827B`.
  - `--border-color` / `--border-light`: `#D8E0DB` / `#7A827B` subtle outline.
- Update `.dark` variables:
  - `--bg-main` / `--background`: `#1B201E` (deep root background).
  - `--bg-card` / `--surface`: `#363B39` (elevated dark cards).
  - `--text-primary`: `#FBFEFE` (crisp white text).
  - `--text-secondary`: `#7A827B` (muted grey text).
  - `--border-color`: `rgba(122, 130, 123, 0.35)`.

### 2. [app/index.html](file:///d:/v2%20BMS%20OFFICIAL/app/index.html)
- Update the main canvas container from flat `bg-white` to `bg-[#EFF4F2] dark:bg-[#1B201E]` so all dashboard cards, bento grids, and quick action widgets clearly stand out with crisp visual depth.

### 3. Verification
- Run `npm run build` to verify clean compilation.
- Verify light and dark mode appearance across owner and branch dashboards.
