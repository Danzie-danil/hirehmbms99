# Banner CTA Interaction Tracking & Server-Side Filter Plan

Implement persistent server-side CTA click recording and intelligent banner filtering in PostgreSQL. Once a user clicks the Call-To-Action on an interactive banner, that banner is permanently suppressed for their authenticated account across all devices while regular non-CTA banners persist until administrative removal.

## Server-Side Architecture (Supabase PostgreSQL)
1. **Interaction Table `public.sys_banner_interactions`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `banner_id UUID NOT NULL REFERENCES public.sys_banners(id) ON DELETE CASCADE`
   - `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
   - `has_clicked_cta BOOLEAN DEFAULT true NOT NULL`
   - `clicked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL`
   - `CONSTRAINT unique_user_banner_interaction UNIQUE (user_id, banner_id)`
2. **Server-Side RPC `public.record_banner_cta_click(p_banner_id UUID)`**:
   - `SECURITY DEFINER` function that upserts `(user_id, banner_id, has_clicked_cta = true)`.
3. **Server-Side RPC `public.get_active_sys_banners()`**:
   - Evaluates active banners and filters out any banner where `cta_enabled = true` AND `EXISTS (SELECT 1 FROM sys_banner_interactions WHERE user_id = auth.uid() AND banner_id = sb.id AND has_clicked_cta = true)`.
   - Returns unclicked CTA banners and all non-CTA active banners.

## Client-Side Presentation Layer
1. **[js/ui/dashboardView.js](file:///d:/v2%20BMS%20OFFICIAL/js/ui/dashboardView.js)**:
   - Pass `b.id` to `window.handleBannerCtaAction(action, target, bannerId)`.
   - On CTA click, execute `supabase.rpc('record_banner_cta_click', { p_banner_id: bannerId })` in the background.
   - Instantly dismiss the clicked banner row from the DOM.

## Verification
- Validate `npm run build` completes with 0 errors.
- Confirm full multi-device persistence via Postgres table checks.
