# Supabase Server-Side Computations & Thin Client Architecture

Ensure heavy operations (such as survey analytics, KPI metrics, option distribution percentages, average ratings, and validation) are computed directly on **Supabase PostgreSQL** via database RPC functions rather than in the user's browser, keeping the client as a thin request-response UI.

## User Review Required
> [!IMPORTANT]
> A dedicated SQL migration file has been created at [supabase/0001_create_survey_server_side_computations.sql](file:///d:/v2%20BMS%20OFFICIAL/supabase/0001_create_survey_server_side_computations.sql). Per workspace security rules, this SQL must be executed manually in your Supabase SQL Editor.

## Architecture & Computation Strategy
1. **Server-Side Global Metrics (`public.get_sys_survey_kpi_summary`)**:
   - Computes `total_surveys`, `active_surveys`, `total_responses`, and `avg_satisfaction` directly inside PostgreSQL using JSONB extraction functions.
   - Eliminates transferring full response datasets over the network to calculate averages.
2. **Server-Side Survey Analytics & Breakdowns (`public.get_sys_survey_analytics`)**:
   - Pre-aggregates question response counts, choice distribution maps (`{ "Option A": count }`), star rating counts (`1..5`), rating averages, and sanitized feedback text streams on Supabase.
   - The device simply requests this RPC when opening the analytics modal and renders the pre-computed payload.
3. **Thin Client Operations**:
   - `js/admin/surveys.js`: Replaces client-side loop math (`calculateAverageSatisfaction`, raw response reductions) with `supabase.rpc('get_sys_survey_kpi_summary')` and `supabase.rpc('get_sys_survey_analytics')`.
   - `js/ui/surveyModal.js`: Submits answers directly via `supabase.rpc('submit_sys_survey_response')`.

## Proposed Changes

### Database Layer
#### [NEW] [0001_create_survey_server_side_computations.sql](file:///d:/v2%20BMS%20OFFICIAL/supabase/0001_create_survey_server_side_computations.sql)
- Defines `get_sys_survey_kpi_summary()` and `get_sys_survey_analytics(p_survey_id UUID)` RPC functions with `SECURITY DEFINER` and `is_sys_admin()` validation.

### Frontend Client Layer
#### [MODIFY] [surveys.js](file:///d:/v2%20BMS%20OFFICIAL/js/admin/surveys.js)
- Refactor `loadSurveysData()` and KPI rendering to read pre-aggregated values from `get_sys_survey_kpi_summary()`.
- Refactor `openSurveyAnalyticsModal(surveyId)` to fetch pre-computed question breakdown statistics from `get_sys_survey_analytics()`.

## Verification Plan
1. **Build Verification**: Run `npm run build` to verify clean compilation with 0 lint/bundling errors.
2. **RPC Function Execution & Fallback**: Ensure client gracefully falls back if RPC is pending migration while prioritizing server-computed payloads.
