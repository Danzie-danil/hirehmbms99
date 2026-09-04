# Implementation Plan: AI Assistant System Prompt Training, App Context & Action Buttons Migration

Enhance the AI Assistant's knowledge base, training prompts, UI route button action mappings, and response style in Supabase and Vite dev proxy to deliver highly contextual, convincing, and actionable responses across all models (`openai/gpt-oss-120b`, `qwen/qwen3.6-27b`, `openai/gpt-oss-20b`).

## Proposed Changes

### 1. Database & SQL Migrations ([supabase/](file:///d:/v2%20BMS%20OFFICIAL/supabase))
#### [NEW] [0001_enhance_ai_knowledge_and_system_prompt_compiler.sql](file:///d:/v2%20BMS%20OFFICIAL/supabase/0001_enhance_ai_knowledge_and_system_prompt_compiler.sql)
- Insert comprehensive domain training prompts into `public.sys_ai_prompts`:
  - `base_behavior_rules`: Conversational tone, bilingual handling (EN/SW), no crutch phrases, proactive guidance.
  - `technical_formatting_rules`: Strict markdown route buttons, clean formatting, no database/SQL jargon.
  - `bmstz_app_knowledge`: Comprehensive modules overview, financial formulas (COGS, Gross Profit, Reconciliation), stock distribution flows, POS, till reconciliation, and step-by-step feature guides.
  - `route_action_catalog`: Complete catalog of in-app navigation buttons.
- Update `public.get_compiled_ai_system_prompt(p_user_id, p_message)`:
  - Dynamically assemble role-aware context (BSO vs BR vs Sysadmin), plan capabilities, relevant knowledge chunks from `agent_knowledge`, and conversation history into a structured prompt tailored for GPT OSS 120B / Qwen 3.6.
- Update `supabase/0001_single_run_latest_build_migrations.sql`.

### 2. Localhost Dev Server Proxy ([vite.config.js](file:///d:/v2%20BMS%20OFFICIAL/vite.config.js))
#### [MODIFY] [vite.config.js](file:///d:/v2%20BMS%20OFFICIAL/vite.config.js)
- Enhance local dev `/api/chat` proxy with the complete rich BMSTz system prompt, route action button definitions, and domain instructions so local development has the same high-quality responses as production.

## Verification Plan
1. **SQL Syntax & Compilation**:
   - Verify SQL file structure and single-run sync.
2. **Build Verification**:
   - Run `npm run build` to ensure 0 lint and bundle errors.
3. **Local Dev Server**:
   - Verify dev server runs smoothly and returns rich contextual responses with clickable buttons.
