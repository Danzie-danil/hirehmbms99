# Implementation Plan: AI Assistant 3-Day Security Lockout & Bypass Prevention Failsafe

Implement a server-side failsafe in Supabase that automatically blocks a user's access to the AI Assistant for 3 days if they attempt to bypass account boundaries, impersonate system administrators, probe for root credentials, or manipulate system administrative controls.

## Proposed Changes

### 1. Database & SQL Migrations ([supabase/](file:///d:/v2%20BMS%20OFFICIAL/supabase))
#### [NEW] [0001_ai_security_failsafe_3day_lockout.sql](file:///d:/v2%20BMS%20OFFICIAL/supabase/0001_ai_security_failsafe_3day_lockout.sql)
- Create `public.sys_ai_lockouts` table to record user lockouts (`user_id`, `blocked_until`, `reason`, `incident_payload`).
- Create `public.block_user_ai_access(p_user_id UUID, p_reason TEXT, p_duration_days INT)` RPC.
- Update `public.resolve_ai_context(p_user_id)` to check active lockouts and return `{ ai_access: false, reason: 'ai_security_lockout', blocked_until: ... }`.
- Update `public.get_compiled_ai_system_prompt(p_user_id, p_message)` to automatically trigger the 3-day lockout if a non-admin user submits an admin bypass / impersonation payload, immediately halting further AI interaction.
- Update `supabase/0001_single_run_latest_build_migrations.sql`.

### 2. Backend & Serverless API ([api/chat.js](file:///d:/v2%20BMS%20OFFICIAL/api/chat.js))
#### [MODIFY] [api/chat.js](file:///d:/v2%20BMS%20OFFICIAL/api/chat.js)
- Handle `ai_security_lockout` response from `get_compiled_ai_system_prompt`.
- Return a clear, strict HTTP 403 response with lock duration details.

### 3. Local Development Proxy ([vite.config.js](file:///d:/v2%20BMS%20OFFICIAL/vite.config.js))
#### [MODIFY] [vite.config.js](file:///d:/v2%20BMS%20OFFICIAL/vite.config.js)
- Implement local lockout tracking and bypass detection in `/api/chat` dev middleware.

### 4. Client-Side AI Widget ([js/aiAssistant.js](file:///d:/v2%20BMS%20OFFICIAL/js/aiAssistant.js))
#### [MODIFY] [js/aiAssistant.js](file:///d:/v2%20BMS%20OFFICIAL/js/aiAssistant.js)
- Display a dedicated security lockout banner in the chat drawer when locked out.
- Disable input field (`input.disabled = true`, placeholder: *"AI Assistant access suspended for 3 days due to security policy violations"*).

## Verification Plan
1. **Build Verification**:
   - Run `npm run build` to verify 0 errors.
2. **Local & Database Testing**:
   - Test admin bypass inputs and ensure automated 3-day lockout triggers properly.
