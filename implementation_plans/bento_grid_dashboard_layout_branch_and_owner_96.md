# Bento Grid Dashboard Layout Transformation (#branch & #owner)_96

## Overview
Transform both the **Branch Dashboard** (`js/branch/dashboard.js`) and **Owner Overview** (`js/owner/overview.js`) into a modern, high-contrast **Bento Grid Architecture** inspired by the LogiTrack reference design. This upgrade enhances visual hierarchy, information density, and aesthetics using flat surfaces, crisp dividers, lightweight inline SVG micro-sparklines, concentric progress rings, and structured 3-column asymmetric desktop grids while preserving seamless mobile responsiveness.

---

## User Review Required

> [!IMPORTANT]
> **Zero Reversion & Code Guard:**
> All underlying business logic, real-time repository hydration (`getBranchDashboardData`, `getOwnerDashboardData`), database calls, offline queuing, caching, and role-based permissions remain 100% intact. Only visual presentation, layout containers, and micro-visualizations (SVG sparklines, donut progress rings) are redesigned.

> [!TIP]
> **No External Chart Libraries Needed:**
> All sparklines, mini bar graphs, and concentric donut progress rings are rendered using pure, ultra-fast inline SVG for zero latency and instant render speeds (<5ms).

---

## Proposed Layout Architecture

### 1. Branch Dashboard Bento Architecture (`#branch`)
```
+-----------------------------------------------------------------------------------------------+
| HEADER: "Welcome back, [Manager Name]" | Branch Badge | Today's Date | Quick Till Status      |
+-----------------------------------------------------------------------------------------------+
| TOP KPI ROW (4-5 Cards): [Today's Sales 📈] [Transactions 📊] [Expenses 📉] [Target 🎯]       |
+-----------------------------------+-----------------------------------+-----------------------+
| LEFT BENTO COLUMN (35%):          | CENTER BENTO COLUMN (40%):        | RIGHT BENTO COLUMN:   |
| • Quick Actions Hub (Grid tiles)  | • Daily Target Radial / Ring SVG  | • Top Selling Items   |
| • Active Shift & Till Balance     | • Live Today's Sales Stream       | • Low Stock & Tasks   |
|   Widget                          |   (Avatars, amounts, time)        |   Action Cards        |
+-----------------------------------+-----------------------------------+-----------------------+
```

### 2. Owner Overview Bento Architecture (`#owner`)
```
+-----------------------------------------------------------------------------------------------+
| HEADER: Business Title | Plan Badge | Consolidated Date | Location / Branch Filter Select     |
+-----------------------------------------------------------------------------------------------+
| TOP KPI ROW (4 Cards with SVG Sparklines):                                                    |
| [Revenue Today 📈] [Total Capital 💼] [Inventory Valuation 📦] [Net Profitability 🎯]          |
+-----------------------------------+-----------------------------------+-----------------------+
| LEFT BENTO COLUMN (35%):          | CENTER BENTO COLUMN (40%):        | RIGHT BENTO COLUMN:   |
| • Concentric Donut Progress Ring  | • Multi-Branch Target Progress &  | • Live Activity Feed  |
|   (Revenue vs Target vs Expense)  |   Revenue Leaderboard             |   (User avatars, time)|
| • Financial Summary Snapshot      | • Recent Invoices / Sales Table   | • Executive Shortcuts |
+-----------------------------------+-----------------------------------+-----------------------+
```

---

## Proposed Changes

### Branch Dashboard (`#branch`)
#### [MODIFY] [js/branch/dashboard.js](file:///d:/v2%20BMS%20OFFICIAL/js/branch/dashboard.js)
- **Top Greeting Bar**: Refined title banner with "Welcome back, [Manager/User]" and quick date + till status indicator.
- **Micro-Sparkline KPI Cards**: Each top KPI card gets a lightweight inline SVG trendline or mini bar graphic on the right side.
- **Asymmetric 3-Column Bento Grid**:
  1. *Left Bento Card*: Re-architected Quick Actions with vibrant SVG icon badges and live till float display.
  2. *Center Bento Card*: Circular SVG Target Ring with percentage completion + Live sales feed with customer initials avatar badges.
  3. *Right Bento Card*: Top Sellers ranking with miniature progress meters + Pending tasks / inventory restock alerts.
- **Mobile First**: Gracefully adapts into single column stack on screens `< 1024px`.

---

### Owner Overview (`#owner`)
#### [MODIFY] [js/owner/overview.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/overview.js)
- **Top Header Bento Strip**: Clean business title, subscription tier badge, and location dropdown.
- **Executive KPI Cards**: 4 primary KPI cards (Today's Revenue, Business Capital, Stock Valuation, Net Profit) featuring inline SVG sparkline wave/bar visualizations.
- **Asymmetric 3-Column Bento Grid**:
  1. *Left Bento Card*: Concentric SVG Donut chart displaying revenue vs target vs expenses breakdown + monthly aggregate snapshot.
  2. *Center Bento Card*: Multi-branch performance comparative progress bars and revenue stream.
  3. *Right Bento Card*: Live chronological activity feed with circular user avatar badges + executive quick actions.
- **Mobile First**: Stacks vertically on mobile viewports for full touch accessibility.

---

## Verification Plan

### Automated Build Validation
- Run `npm run build` to verify clean compilation with 0 lint or bundle errors.

### Visual & Functional Verification
1. **Branch View**: Check KPI cards, Quick Action tiles, Target Progress ring, and Live Sales stream in both Light and Dark modes.
2. **Owner View**: Verify multi-branch data aggregation, concentric donut SVG rendering, branch progress meters, and activity feed.
3. **Mobile & Desktop**: Verify seamless responsive layout across mobile (< 640px), tablet (640px-1024px), and desktop (1024px+).
