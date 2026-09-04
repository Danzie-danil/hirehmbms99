# Implementation Plan: Owner Staff Creation, Payroll Staff Integration & Branch Preferences

This plan introduces full **Owner Staff Creation & Branch Assignment**, **Seamless Staff Integration into Payroll Entries**, and **Branch Preferences for Staff Creation Restrictions**.

---

## User Review Required

> [!IMPORTANT]
> - **Owner Staff Creation**: Business Owners can create and edit staff members from the **Staff & HR** view, including setting names, roles, contact info, salaries, and assigning them to any branch location.
> - **Payroll Staff Auto-Fill**: In the **Payroll** module, when creating a payroll entry, Owners and Managers can select from configured system staff members instead of typing names manually. Selecting a staff member auto-fills their assigned branch, role, and monthly salary rate.
> - **Branch Staff Preference Control**: A new toggle `Add Staff Members` (`staff_add`) is added to **Branch Preferences & Allowlist**. When disabled by the Owner for a branch, Branch Managers will be restricted from adding new staff records in that branch.

---

## Proposed Changes

### Core Database & Preference System

#### [MODIFY] [`js/modals.js`](file:///d:/v2%20BMS%20OFFICIAL/js/modals.js)
- Add `staff_add` toggle option to the `ACTIONS` array in `case 'branchPreferences'`:
  ```js
  {
      key: 'staff_add',
      label: 'Add Staff Members',
      desc: 'Branch can add new staff records for this branch directly',
      icon: 'users-plus',
      color: 'blue'
  }
  ```
- Add modal handler `case 'addOwnerStaff'` and `case 'editOwnerStaff'` for creating and updating staff across any branch location.
- Add `window.handleSaveOwnerStaff` to submit new/updated staff records via `dbStaff.add` or `dbStaff.update`.

---

### Staff & HR Module (Owner Portal)

#### [MODIFY] [`js/owner/staff.js`](file:///d:/v2%20BMS%20OFFICIAL/js/owner/staff.js)
- Add an **`+ Add Staff`** primary button in the header of `renderOwnerStaffModule()`.
- Add `window.openOwnerAddStaffModal(staffId = null)` function allowing the owner to:
  - Select an assigned branch from a dropdown of all business branches.
  - Set staff name, role/title, salary amount, phone number, and email.
  - Choose active/inactive status.
- Update staff card list to include an **Edit** action button next to **See Details** so Owners can update roles, salaries, or reassign branches.

---

### Staff & HR Module (Branch Portal)

#### [MODIFY] [`js/branch/staff.js`](file:///d:/v2%20BMS%20OFFICIAL/js/branch/staff.js)
- Check branch preference `state.branchProfile?.preferences?.staff_add` before enabling staff creation.
- If `staff_add === false` (restricted by Owner), disable or hide the `+ Add Staff` button and display an informative badge notice: *"Staff creation for this branch is restricted by the business owner."*

---

### Payroll & Salary Management

#### [MODIFY] [`js/owner/payroll.js`](file:///d:/v2%20BMS%20OFFICIAL/js/owner/payroll.js)
- Fetch all configured staff members in `renderAddPayrollView()`.
- Replace the plain text input `#payStaffName` with a **Staff Picker Premium Dropdown**:
  - Selecting a staff member automatically sets:
    - Staff Name (`#payStaffName`)
    - Assigned Branch (`#payBranch`)
    - Role / Title (`#payRole`)
    - Salary Amount (`#payAmount`)
  - Includes a fallback option: *"Custom / Unlisted Staff"* for manual entry.

---

## Verification Plan

### Automated Build Verification
- Execute `npm run build` to verify 0 syntax, import, or bundling errors.

### Manual Verification Steps
1. **Owner Staff Creation**:
   - Log in as Owner (`#owner`).
   - Navigate to **Staff & HR**.
   - Click `+ Add Staff`, select a branch, enter details, and click Save.
   - Verify staff appears under the chosen branch with correct role and salary.
2. **Payroll Selection**:
   - Open **Payroll** view and click `Add Payroll Entry`.
   - Select the newly created staff member from the staff dropdown.
   - Confirm branch, role, and salary auto-populate instantly.
3. **Branch Preference Restriction**:
   - Open **Branches**, click `Branch Preferences & Allowlist`.
   - Toggle `Add Staff Members` to off/Approval for a branch.
   - Log in as Branch Manager for that branch (`#branch`).
   - Navigate to **Staff & HR** and confirm staff creation is disabled as configured.
