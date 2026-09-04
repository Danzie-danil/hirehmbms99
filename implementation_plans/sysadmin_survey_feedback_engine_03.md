# Implementation Plan: System Administrator "Feedback and Survey" Dedicated Module & Realtime Engine

## Overview
Implement an interactive, multi-step Survey & Feedback Engine for the BMS Multi-Tenant System featuring a **dedicated System Administrator module labeled "Feedback and Survey"** (`js/admin/surveys.js`). This allows System Administrators to author, test-preview, dispatch, and analyze targeted multi-question surveys that trigger **in real time** on platform users' screens.
- On **mobile**: Opens as an authentic **iOS Bottom Sheet** (`rounded-t-3xl`, slide-up from bottom with drag indicator).
- On **desktop**: Opens as an adaptive centered confirmation-style modal without heavy glassmorphic compute overhead.
- Includes smooth slide ease-out/ease-in step transitions, instant auto-advancement on single choices, and real-time Supabase Realtime pub/sub listeners.
- Dedicated Admin module provides response analytics, interactive breakdown charts, and controls to wipe/delete response activities or remove surveys.

---

## 1. User Voice Message Transcript & Directives
> *"Okay, great. Now, let us implement a feedback system via, you know, survey questions. I want to be able to push a a survey feedback, um, pop-up overlay, which I can set questions and, you know, replies, and then it progresses to the next screen, to the next screen until all the questions are over. One question can have multiple replies. After a user clicks the reply, it moves to the next screen with like an ease-out animation and an ease-in to the other question. And we can we can make it that the um the pop-up modal is heavily um very much adaptive to all screen sizes. And I like how our current confirm modals look like, so if you can reference how the confirmation modals are designed, I would I would like us to mimic that design, but except that we are customizing it for the feedback um survey questions. So as an admin, I will be able to push these uh um survey feedback modals from my view, and the users will see them immediately and choose to participate or choose to ignore."*
> 
> *Refinements:*
> - "admin can have options to delete recent survey activities or keep them."
> - "lets not us glassmorph to save compute resources. also, for mobile, i want this to open as how ios stylesheet opens."
> - "all these should trigger in real time, no delays no refresh."
> - "create a separate module, labeled Feedback and Survey". use tht to implement the feedback and survey . update the plan and proceed"

---

## 2. Architecture & Design

### A. Database Schema & RPCs (`supabase/0001_create_survey_feedback_system.sql`)
1. **`sys_surveys` Table**:
   - `id`: UUID (Primary Key)
   - `title`: TEXT (Survey Title / Campaign Name)
   - `description`: TEXT (Subtitle / Incentive description)
   - `target_audience`: TEXT (`all`, `owners`, `managers`)
   - `status`: TEXT (`draft`, `active`, `closed`)
   - `questions`: JSONB (Array of question objects: `{ id, text, type, options, required }`)
   - `created_at`, `updated_at`: TIMESTAMPTZ

2. **`sys_survey_responses` Table**:
   - `id`: UUID (Primary Key)
   - `survey_id`: UUID (Foreign Key to `sys_surveys` ON DELETE CASCADE)
   - `user_id`: UUID (Auth user id)
   - `user_email`: TEXT
   - `user_role`: TEXT (`owner`, `branch_manager`)
   - `answers`: JSONB (Key-value map of `{ question_id: response }`)
   - `created_at`: TIMESTAMPTZ

3. **Realtime Replication & RPCs**:
   - Added to `supabase_realtime` publication.
   - `submit_sys_survey_response(p_survey_id UUID, p_answers JSONB, p_user_role TEXT)`
   - `clear_sys_survey_responses(p_survey_id UUID)` (Sysadmin only)

---

### B. Dedicated Admin Module: "Feedback and Survey" (`js/admin/surveys.js`)
- Dedicated Sysadmin Sidebar Item: `<i data-lucide="clipboard-check"></i> Feedback and Survey` (`sysadmin-surveys`).
- Module Layout & Subtabs:
  1. **Overview & Studio Subtab (`studio`)**:
     - Metric cards: Total Surveys, Active Campaigns, Total Responses Collected, Average CSAT/Rating.
     - **Interactive Survey Builder**:
       - Title, Subtitle, Audience target (using `window.renderPremiumSelect`).
       - Dynamic Question Creator: Add/Remove questions, select question types (`Single Choice`, `Multiple Choice`, `Star/Emoji Rating`, `Open Feedback Text`), add/remove reply options.
       - **Test & Preview Button**: Directly opens the survey overlay in admin mode for immediate testing.
       - **Save as Draft** & **Publish & Push Live (Realtime)** buttons.
  2. **Campaigns & Responses Ledger Subtab (`ledger`)**:
     - Interactive list of all surveys with response counts and status pills.
     - **Analytics Drawer/Modal**: Visual percentage progress bars per choice, rating distribution gauge, and open-text feedback streams.
     - **Clear Response Activities**: Wipes recent survey submissions.
     - **Close / Re-open Survey**.
     - **Delete Survey**.

---

### C. Client-Side Real-Time Interactive Survey Overlay (`js/ui/surveyModal.js`)
- **Realtime Trigger**: Automatically catches `INSERT` or `UPDATE` on `sys_surveys` and immediately invokes the survey modal for target users.
- **Mobile Presentation**: iOS Action Sheet / Bottom Sheet (`rounded-t-3xl`, slide-up from bottom with drag indicator).
- **Desktop Presentation**: Centered confirmation modal (`max-w-lg rounded-3xl`).
- **Smooth Animations**: Ease-out / ease-in slide transitions with progress bar and instant auto-advancement on single choices.
- **Completion**: Congratulatory celebration card with auto-dismiss.

---

## 3. Implementation Steps

1. **Step 1: SQL Migration Script** (`supabase/0001_create_survey_feedback_system.sql`) - Completed.
2. **Step 2: Client Survey Engine** (`js/ui/surveyModal.js`) - Completed.
3. **Step 3: Sysadmin Dedicated Module** (`js/admin/surveys.js`) - Create standalone module for "Feedback and Survey".
4. **Step 4: Sysadmin Navigation & Router Integration** (`app/index.html`, `js/admin/dashboard.js`, `js/auth.js`).
5. **Step 5: Verification & Build** (`npm run build`, chat history update).
