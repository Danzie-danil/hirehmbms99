# BMSTz Assistant Modal Integration Plan

This plan outlines the integration of context-aware BMSTz Assistant help triggers inside selected Owner and Branch modals. The assistant will act strictly as a conversational advisor (no auto-filling or automatic form manipulation), with access gated to the **Exclusive plan** and controlled globally via a **System Admin toggle**.

---

## Technical Architecture & Rules

### 1. Plan Gating (Exclusive Plan Only)
- A new feature flag `modal_ai_assistant` will be added to the `exclusive` plan in `PLAN_FEATURES` inside `js/plan.js`.
- The helper buttons will only render if `window.hasFeature('modal_ai_assistant')` returns `true`.

### 2. System Admin Control Toggle
- A global settings switch `enable_modal_ai_assistant` will be added to the System Admin "Platform Controls" tab.
- If toggled `false` by the admin, the assistant helper buttons are hidden globally for all users, regardless of their subscription plan.
- Real-time updates to this setting will automatically synchronize with active clients using the Supabase listener.

### 3. Dedicated Trigger Buttons (No Auto-Fill)
- Standard, non-intrusive buttons labelled `✨ BMSTz Assistant` will be placed in the target modals.
- When clicked, the button will open the existing floating AI chat drawer (`ai-chat-drawer`) and trigger a contextual prompt relevant to the active modal, drawing upon the database/app knowledge base.
- **Task Modal (`assignTask`):** Starts a conversation about task definition guidelines, routines, and checklists.
- **Expense Modal (`addExpense`):** Starts a conversation about expense categorization rules and budget advice.
- **Inventory Modal (`restockStock`):** Starts a conversation about reorder point calculations, safety stock guidelines, and inventory strategies.

### 4. Responsive Layout Support
- The existing `ai-chat-drawer` already handles responsive viewports (displays as a drawer on desktop and slides up from the bottom on mobile). By utilizing this drawer, we ensure the UI is clean and does not clutter or clip screen space on smaller devices.

---

## Proposed Changes

### Subscription & Permissions

---

#### [MODIFY] [plan.js](file:///d:/v2%20BMS%20OFFICIAL/js/plan.js)
- Add `modal_ai_assistant: ['exclusive']` to `PLAN_FEATURES`.

#### [MODIFY] [main.js](file:///d:/v2%20BMS%20OFFICIAL/js/main.js)
- Expose `window.hasFeature = Plan.hasFeature;` to make feature checks globally accessible.

---

### System Admin Panel

---

#### [MODIFY] [admin/dashboard.js](file:///d:/v2%20BMS%20OFFICIAL/js/admin/dashboard.js)
- Load `enable_modal_ai_assistant` from `sys_settings` on dashboard initialization.
- Render the toggle switch inside the "Global Controls" panel of "Platform Controls".
- Add `window.toggleModalAiControl()` to persist the setting in `sys_settings`.

---

### Modals & AI Integration

---

#### [MODIFY] [aiAssistant.js](file:///d:/v2%20BMS%20OFFICIAL/js/aiAssistant.js)
- Maintain and check `sysSettings.enable_modal_ai_assistant` to control the display.
- Add `window.openAiWithContext(modalType, details)` to open the chat widget, check language preference, and trigger a contextual question related to the modal (e.g. asking for checklist ideas or restock formulas).

#### [MODIFY] [modals.js](file:///d:/v2%20BMS%20OFFICIAL/js/modals.js)
- Check plan feature accessibility and admin toggles when rendering:
  - `case 'assignTask'`
  - `case 'addExpense'`
  - `case 'restockStock'`
- Render a dedicated button:
  ```html
  <button type="button" onclick="window.openAiWithContext('tasks')" class="...">
      <i data-lucide="sparkles" class="w-3.5 h-3.5 mr-1"></i> ✨ BMSTz Assistant
  </button>
  ```

---

## Verification Plan

### Automated Tests
- None. Manual visual verification.

### Manual Verification
1. Log in as System Admin, go to Platform Controls, verify the "AI Modal Assistants" switch toggles correctly and saves in Supabase.
2. Log in as a Branch Manager / Owner on a Free or Starter plan. Verify that the `✨ BMSTz Assistant` buttons are NOT rendered.
3. Log in as an Owner on the **Exclusive** plan. Go to Tasks/Expenses/Inventory and verify the `✨ BMSTz Assistant` button appears.
4. Click the button in each modal, and verify it opens the chat widget with the corresponding contextual prompt.
