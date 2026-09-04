**PART 1**
| table_name               | rls_enabled | force_rls | policy_count |
| ------------------------ | ----------- | --------- | ------------ |
| access_logs              | ✅ ON        | -         | 2            |
| access_requests          | ✅ ON        | -         | 3            |
| agent_knowledge          | ✅ ON        | -         | 2            |
| announcement_dismissals  | ✅ ON        | -         | 1            |
| announcements            | ✅ ON        | -         | 1            |
| archived_conversations   | ✅ ON        | -         | 1            |
| attendance               | ✅ ON        | -         | 1            |
| branches                 | ✅ ON        | -         | 6            |
| cash_drawer              | ✅ ON        | -         | 1            |
| cash_transactions        | ✅ ON        | -         | 1            |
| central_inventory        | ✅ ON        | -         | 2            |
| chat_groups              | ✅ ON        | -         | 1            |
| customer_payments        | ✅ ON        | -         | 0            |
| customer_tags            | ✅ ON        | -         | 1            |
| customers                | ✅ ON        | -         | 6            |
| dashboard_dismissals     | ✅ ON        | -         | 1            |
| document_items           | ✅ ON        | -         | 1            |
| documents                | ✅ ON        | -         | 5            |
| exchange_rates           | ✅ ON        | -         | 1            |
| expense_tags             | ✅ ON        | -         | 1            |
| expenses                 | ✅ ON        | -         | 6            |
| goals                    | ✅ ON        | -         | 1            |
| group_members            | ✅ ON        | -         | 1            |
| inventory                | ✅ ON        | -         | 4            |
| inventory_purchases      | ✅ ON        | -         | 4            |
| inventory_tags           | ✅ ON        | -         | 1            |
| loan_tags                | ✅ ON        | -         | 1            |
| loans                    | ✅ ON        | -         | 6            |
| loyalty_transactions     | ✅ ON        | -         | 1            |
| messages                 | ✅ ON        | -         | 1            |
| note_tags                | ✅ ON        | -         | 1            |
| notes                    | ✅ ON        | -         | 2            |
| notification_preferences | ✅ ON        | -         | 4            |
| notification_reads       | ✅ ON        | -         | 1            |
| notification_recipients  | ✅ ON        | -         | 2            |
| notifications            | ✅ ON        | -         | 0            |
| payroll                  | ✅ ON        | -         | 1            |
| pinned_messages          | ✅ ON        | -         | 1            |
| po_items                 | ✅ ON        | -         | 1            |
| product_returns          | ✅ ON        | -         | 1            |
| profiles                 | ✅ ON        | -         | 7            |
| promotions               | ✅ ON        | -         | 1            |
| purchase_orders          | ✅ ON        | -         | 5            |
| quotation_items          | ✅ ON        | -         | 1            |
| quotations               | ✅ ON        | -         | 5            |
| requests                 | ✅ ON        | -         | 2            |
| saas_audit_logs          | ✅ ON        | -         | 1            |
| sale_tags                | ✅ ON        | -         | 1            |
| sales                    | ✅ ON        | -         | 3            |
| shifts                   | ✅ ON        | -         | 1            |
| staff                    | ✅ ON        | -         | 1            |
| starred_messages         | ✅ ON        | -         | 1            |
| stock_movements          | ✅ ON        | -         | 1            |
| stock_transfers          | ✅ ON        | -         | 1            |
| suppliers                | ✅ ON        | -         | 5            |
| support_requests         | ✅ ON        | -         | 2            |
| sys_admins               | ✅ ON        | -         | 4            |
| sys_ai_chat_messages     | ✅ ON        | -         | 1            |
| sys_ai_prompts           | ✅ ON        | -         | 1            |
| sys_audit_logs           | ✅ ON        | -         | 5            |
| sys_banners              | ✅ ON        | -         | 5            |
| sys_broadcasts           | ✅ ON        | -         | 4            |
| sys_email_broadcasts     | ✅ ON        | -         | 1            |
| sys_email_drafts         | ✅ ON        | -         | 1            |
| sys_feature_flags        | ✅ ON        | -         | 2            |
| sys_newsletter_logs      | ✅ ON        | -         | 4            |
| sys_page_views           | ✅ ON        | -         | 2            |
| sys_popups               | ✅ ON        | -         | 1            |
| sys_pricing_plans        | ✅ ON        | -         | 2            |
| sys_rate_limits          | ✅ ON        | -         | 4            |
| sys_scheduled_toasts     | ✅ ON        | -         | 2            |
| sys_security_events      | ✅ ON        | -         | 2            |
| sys_settings             | ✅ ON        | -         | 5            |
| sys_step_up_sessions     | ✅ ON        | -         | 4            |
| sys_tickets              | ✅ ON        | -         | 2            |
| sys_toasts               | ✅ ON        | -         | 1            |
| task_comments            | ✅ ON        | -         | 2            |
| task_tags                | ✅ ON        | -         | 1            |
| tasks                    | ✅ ON        | -         | 6            |

**PART 2**
| tablename                | policyname                                          | operation | permissive | roles           | using_clause                                                                                                                                                                                             | with_check_clause                                                                                                                      |
| ------------------------ | --------------------------------------------------- | --------- | ---------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| access_logs              | Allow log insertion                                 | INSERT    | PERMISSIVE | {public}        | null                                                                                                                                                                                                     | true                                                                                                                                   |
| access_logs              | Owners can view their logs                          | SELECT    | PERMISSIVE | {public}        | (auth.uid() = owner_id)                                                                                                                                                                                  | null                                                                                                                                   |
| access_requests          | Anon can insert requests                            | INSERT    | PERMISSIVE | {public}        | null                                                                                                                                                                                                     | true                                                                                                                                   |
| access_requests          | Owners can view requests                            | SELECT    | PERMISSIVE | {public}        | (auth.uid() = owner_id)                                                                                                                                                                                  | null                                                                                                                                   |
| access_requests          | Owners can update requests                          | UPDATE    | PERMISSIVE | {public}        | (auth.uid() = owner_id)                                                                                                                                                                                  | null                                                                                                                                   |
| agent_knowledge          | agent_knowledge_sysadmin_write                      | ALL       | PERMISSIVE | {authenticated} | is_sys_admin()                                                                                                                                                                                           | is_sys_admin()                                                                                                                         |
| agent_knowledge          | agent_knowledge_read                                | SELECT    | PERMISSIVE | {authenticated} | (is_active = true)                                                                                                                                                                                       | null                                                                                                                                   |
| announcement_dismissals  | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| announcements            | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| archived_conversations   | Enable all for research archive                     | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | null                                                                                                                                   |
| attendance               | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| branches                 | Public Access                                       | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| branches                 | Strict branches access                              | ALL       | PERMISSIVE | {public}        | ((auth.uid() = owner_id) OR (auth.uid() = manager_id))                                                                                                                                                   | (auth.uid() = owner_id)                                                                                                                |
| branches                 | branches_delete                                     | DELETE    | PERMISSIVE | {authenticated} | ((owner_id = auth.uid()) OR is_sys_admin())                                                                                                                                                              | null                                                                                                                                   |
| branches                 | branches_insert                                     | INSERT    | PERMISSIVE | {authenticated} | null                                                                                                                                                                                                     | ((owner_id = auth.uid()) OR is_sys_admin())                                                                                            |
| branches                 | branches_select                                     | SELECT    | PERMISSIVE | {authenticated} | (is_sys_admin() OR (owner_id = auth.uid()) OR (manager_id = auth.uid()))                                                                                                                                 | null                                                                                                                                   |
| branches                 | branches_update                                     | UPDATE    | PERMISSIVE | {authenticated} | ((owner_id = auth.uid()) OR is_sys_admin())                                                                                                                                                              | ((owner_id = auth.uid()) OR is_sys_admin())                                                                                            |
| cash_drawer              | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| cash_transactions        | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| central_inventory        | central_inventory_select                            | SELECT    | PERMISSIVE | {authenticated} | (is_sys_admin() OR (owner_id = get_current_tenant_id()))                                                                                                                                                 | null                                                                                                                                   |
| central_inventory        | central_inventory_update                            | UPDATE    | PERMISSIVE | {authenticated} | (is_sys_admin() OR (owner_id = get_current_tenant_id()))                                                                                                                                                 | (is_sys_admin() OR (owner_id = get_current_tenant_id()))                                                                               |
| chat_groups              | Enable all for research chat                        | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | null                                                                                                                                   |
| customer_tags            | anon full access customers                          | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| customers                | Public Access                                       | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| customers                | Strict customers access                             | ALL       | PERMISSIVE | {public}        | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE ((branches.owner_id = auth.uid()) OR (branches.manager_id = auth.uid()))))                                                                   | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE ((branches.owner_id = auth.uid()) OR (branches.manager_id = auth.uid())))) |
| customers                | customers_delete                                    | DELETE    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | null                                                                                                                                   |
| customers                | customers_insert                                    | INSERT    | PERMISSIVE | {authenticated} | null                                                                                                                                                                                                     | user_has_branch_access(branch_id)                                                                                                      |
| customers                | customers_select                                    | SELECT    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | null                                                                                                                                   |
| customers                | customers_update                                    | UPDATE    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | user_has_branch_access(branch_id)                                                                                                      |
| dashboard_dismissals     | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| document_items           | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| documents                | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| documents                | doc_delete                                          | DELETE    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | null                                                                                                                                   |
| documents                | doc_insert                                          | INSERT    | PERMISSIVE | {authenticated} | null                                                                                                                                                                                                     | user_has_branch_access(branch_id)                                                                                                      |
| documents                | doc_select                                          | SELECT    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | null                                                                                                                                   |
| documents                | doc_update                                          | UPDATE    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | user_has_branch_access(branch_id)                                                                                                      |
| exchange_rates           | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| expense_tags             | anon full access expenses                           | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| expenses                 | Public Access                                       | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| expenses                 | Strict expenses access                              | ALL       | PERMISSIVE | {public}        | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE ((branches.owner_id = auth.uid()) OR (branches.manager_id = auth.uid()))))                                                                   | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE ((branches.owner_id = auth.uid()) OR (branches.manager_id = auth.uid())))) |
| expenses                 | expenses_delete                                     | DELETE    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | null                                                                                                                                   |
| expenses                 | expenses_insert                                     | INSERT    | PERMISSIVE | {authenticated} | null                                                                                                                                                                                                     | user_has_branch_access(branch_id)                                                                                                      |
| expenses                 | expenses_select                                     | SELECT    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | null                                                                                                                                   |
| expenses                 | expenses_update                                     | UPDATE    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | user_has_branch_access(branch_id)                                                                                                      |
| goals                    | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| group_members            | Enable all for research members                     | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | null                                                                                                                                   |
| inventory                | Strict inventory access                             | ALL       | PERMISSIVE | {public}        | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE ((branches.owner_id = auth.uid()) OR (branches.manager_id = auth.uid()))))                                                                   | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE ((branches.owner_id = auth.uid()) OR (branches.manager_id = auth.uid())))) |
| inventory                | Public Access                                       | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| inventory                | inventory_select                                    | SELECT    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | null                                                                                                                                   |
| inventory                | inventory_update                                    | UPDATE    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | user_has_branch_access(branch_id)                                                                                                      |
| inventory_purchases      | Allow owners to delete purchases for their branches | DELETE    | PERMISSIVE | {public}        | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE (branches.owner_id = auth.uid())))                                                                                                           | null                                                                                                                                   |
| inventory_purchases      | Allow owners to insert purchases for their branches | INSERT    | PERMISSIVE | {public}        | null                                                                                                                                                                                                     | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE (branches.owner_id = auth.uid())))                                         |
| inventory_purchases      | Allow owners to view purchases for their branches   | SELECT    | PERMISSIVE | {public}        | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE (branches.owner_id = auth.uid())))                                                                                                           | null                                                                                                                                   |
| inventory_purchases      | Allow owners to update purchases for their branches | UPDATE    | PERMISSIVE | {public}        | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE (branches.owner_id = auth.uid())))                                                                                                           | null                                                                                                                                   |
| inventory_tags           | anon full access inventory                          | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| loan_tags                | anon full access loans                              | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| loans                    | Public Access                                       | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| loans                    | Strict loans access                                 | ALL       | PERMISSIVE | {public}        | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE ((branches.owner_id = auth.uid()) OR (branches.manager_id = auth.uid()))))                                                                   | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE ((branches.owner_id = auth.uid()) OR (branches.manager_id = auth.uid())))) |
| loans                    | loans_delete                                        | DELETE    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | null                                                                                                                                   |
| loans                    | loans_insert                                        | INSERT    | PERMISSIVE | {authenticated} | null                                                                                                                                                                                                     | user_has_branch_access(branch_id)                                                                                                      |
| loans                    | loans_select                                        | SELECT    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | null                                                                                                                                   |
| loans                    | loans_update                                        | UPDATE    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | user_has_branch_access(branch_id)                                                                                                      |
| loyalty_transactions     | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| messages                 | Enable all for research                             | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | null                                                                                                                                   |
| note_tags                | anon full access notes                              | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| notes                    | Strict notes access                                 | ALL       | PERMISSIVE | {public}        | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE ((branches.owner_id = auth.uid()) OR (branches.manager_id = auth.uid()))))                                                                   | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE ((branches.owner_id = auth.uid()) OR (branches.manager_id = auth.uid())))) |
| notes                    | Public Access                                       | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| notification_preferences | notif_pref_delete                                   | DELETE    | PERMISSIVE | {authenticated} | ((user_id = auth.uid()) OR is_sys_admin())                                                                                                                                                               | null                                                                                                                                   |
| notification_preferences | notif_pref_insert                                   | INSERT    | PERMISSIVE | {authenticated} | null                                                                                                                                                                                                     | (user_id = auth.uid())                                                                                                                 |
| notification_preferences | notif_pref_select                                   | SELECT    | PERMISSIVE | {authenticated} | ((user_id = auth.uid()) OR is_sys_admin())                                                                                                                                                               | null                                                                                                                                   |
| notification_preferences | notif_pref_update                                   | UPDATE    | PERMISSIVE | {authenticated} | ((user_id = auth.uid()) OR is_sys_admin())                                                                                                                                                               | ((user_id = auth.uid()) OR is_sys_admin())                                                                                             |
| notification_reads       | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| notification_recipients  | notif_recipients_select                             | SELECT    | PERMISSIVE | {authenticated} | ((recipient_id = auth.uid()) OR is_sys_admin())                                                                                                                                                          | null                                                                                                                                   |
| notification_recipients  | notif_recipients_deny_direct_update                 | UPDATE    | PERMISSIVE | {authenticated} | is_sys_admin()                                                                                                                                                                                           | is_sys_admin()                                                                                                                         |
| payroll                  | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| pinned_messages          | Enable all for research pins                        | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | null                                                                                                                                   |
| po_items                 | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| product_returns          | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| profiles                 | Anon full access for profiles                       | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| profiles                 | Users can insert own profile                        | INSERT    | PERMISSIVE | {public}        | null                                                                                                                                                                                                     | (auth.uid() = id)                                                                                                                      |
| profiles                 | Users can view own profile                          | SELECT    | PERMISSIVE | {public}        | (auth.uid() = id)                                                                                                                                                                                        | null                                                                                                                                   |
| profiles                 | profiles_select                                     | SELECT    | PERMISSIVE | {authenticated} | (is_sys_admin() OR (id = auth.uid()) OR (id IN ( SELECT branches.owner_id
   FROM branches
  WHERE ((branches.manager_id = auth.uid()) AND (branches.status IS DISTINCT FROM 'deleted'::text)))))        | null                                                                                                                                   |
| profiles                 | Users can update their own profile language         | UPDATE    | PERMISSIVE | {public}        | (auth.uid() = id)                                                                                                                                                                                        | (auth.uid() = id)                                                                                                                      |
| profiles                 | profiles_update                                     | UPDATE    | PERMISSIVE | {authenticated} | ((id = auth.uid()) OR is_sys_admin())                                                                                                                                                                    | ((id = auth.uid()) OR is_sys_admin())                                                                                                  |
| profiles                 | Users can update own profile                        | UPDATE    | PERMISSIVE | {public}        | (auth.uid() = id)                                                                                                                                                                                        | null                                                                                                                                   |
| promotions               | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| purchase_orders          | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| purchase_orders          | po_delete                                           | DELETE    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | null                                                                                                                                   |
| purchase_orders          | po_insert                                           | INSERT    | PERMISSIVE | {authenticated} | null                                                                                                                                                                                                     | user_has_branch_access(branch_id)                                                                                                      |
| purchase_orders          | po_select                                           | SELECT    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | null                                                                                                                                   |
| purchase_orders          | po_update                                           | UPDATE    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | user_has_branch_access(branch_id)                                                                                                      |
| quotation_items          | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| quotations               | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| quotations               | quote_delete                                        | DELETE    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | null                                                                                                                                   |
| quotations               | quote_insert                                        | INSERT    | PERMISSIVE | {authenticated} | null                                                                                                                                                                                                     | user_has_branch_access(branch_id)                                                                                                      |
| quotations               | quote_select                                        | SELECT    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | null                                                                                                                                   |
| quotations               | quote_update                                        | UPDATE    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | user_has_branch_access(branch_id)                                                                                                      |
| requests                 | Enable all for research                             | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | null                                                                                                                                   |
| requests                 | Strict requests access                              | ALL       | PERMISSIVE | {public}        | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE ((branches.owner_id = auth.uid()) OR (branches.manager_id = auth.uid()))))                                                                   | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE ((branches.owner_id = auth.uid()) OR (branches.manager_id = auth.uid())))) |
| saas_audit_logs          | Owners can see their audit logs                     | SELECT    | PERMISSIVE | {public}        | (auth.uid() = owner_id)                                                                                                                                                                                  | null                                                                                                                                   |
| sale_tags                | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| sales                    | Public Access                                       | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| sales                    | Strict sales access                                 | ALL       | PERMISSIVE | {public}        | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE ((branches.owner_id = auth.uid()) OR (branches.manager_id = auth.uid()))))                                                                   | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE ((branches.owner_id = auth.uid()) OR (branches.manager_id = auth.uid())))) |
| sales                    | sales_select                                        | SELECT    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | null                                                                                                                                   |
| shifts                   | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| staff                    | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| starred_messages         | Enable all for research star                        | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | null                                                                                                                                   |
| stock_movements          | stock_movements_select                              | SELECT    | PERMISSIVE | {authenticated} | (is_sys_admin() OR (owner_id = auth.uid()) OR (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE ((branches.manager_id = auth.uid()) AND (branches.status IS DISTINCT FROM 'deleted'::text))))) | null                                                                                                                                   |
| stock_transfers          | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| suppliers                | anon full access                                    | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| suppliers                | supplier_delete                                     | DELETE    | PERMISSIVE | {authenticated} | (is_sys_admin() OR (enterprise_id = get_current_tenant_id()))                                                                                                                                            | null                                                                                                                                   |
| suppliers                | supplier_insert                                     | INSERT    | PERMISSIVE | {authenticated} | null                                                                                                                                                                                                     | (is_sys_admin() OR (enterprise_id = get_current_tenant_id()))                                                                          |
| suppliers                | supplier_select                                     | SELECT    | PERMISSIVE | {authenticated} | (is_sys_admin() OR (enterprise_id = get_current_tenant_id()))                                                                                                                                            | null                                                                                                                                   |
| suppliers                | supplier_update                                     | UPDATE    | PERMISSIVE | {authenticated} | (is_sys_admin() OR (enterprise_id = get_current_tenant_id()))                                                                                                                                            | (is_sys_admin() OR (enterprise_id = get_current_tenant_id()))                                                                          |
| support_requests         | System admins can manage support requests           | ALL       | PERMISSIVE | {authenticated} | ((auth.jwt() ->> 'email'::text) = 'danielidrissa12admin@gmail.com'::text)                                                                                                                                | null                                                                                                                                   |
| support_requests         | Anyone can insert support requests                  | INSERT    | PERMISSIVE | {public}        | null                                                                                                                                                                                                     | true                                                                                                                                   |
| sys_admins               | sys_admins_deny_delete                              | DELETE    | PERMISSIVE | {authenticated} | false                                                                                                                                                                                                    | null                                                                                                                                   |
| sys_admins               | sys_admins_deny_insert                              | INSERT    | PERMISSIVE | {authenticated} | null                                                                                                                                                                                                     | false                                                                                                                                  |
| sys_admins               | sys_admins_select                                   | SELECT    | PERMISSIVE | {authenticated} | (user_id = auth.uid())                                                                                                                                                                                   | null                                                                                                                                   |
| sys_admins               | sys_admins_deny_update                              | UPDATE    | PERMISSIVE | {authenticated} | false                                                                                                                                                                                                    | null                                                                                                                                   |
| sys_ai_chat_messages     | sys_ai_chat_user_all                                | ALL       | PERMISSIVE | {authenticated} | (auth.uid() = user_id)                                                                                                                                                                                   | (auth.uid() = user_id)                                                                                                                 |
| sys_ai_prompts           | sys_ai_prompts_sysadmin_only                        | ALL       | PERMISSIVE | {authenticated} | is_sys_admin()                                                                                                                                                                                           | is_sys_admin()                                                                                                                         |
| sys_audit_logs           | Allow admin access to audit logs                    | ALL       | PERMISSIVE | {public}        | ((auth.jwt() ->> 'email'::text) = 'danielidrissa12admin@gmail.com'::text)                                                                                                                                | null                                                                                                                                   |
| sys_audit_logs           | sys_audit_logs_deny_delete                          | DELETE    | PERMISSIVE | {authenticated} | false                                                                                                                                                                                                    | null                                                                                                                                   |
| sys_audit_logs           | sys_audit_logs_deny_insert                          | INSERT    | PERMISSIVE | {authenticated} | null                                                                                                                                                                                                     | false                                                                                                                                  |
| sys_audit_logs           | sys_audit_logs_select                               | SELECT    | PERMISSIVE | {authenticated} | is_sys_admin()                                                                                                                                                                                           | null                                                                                                                                   |
| sys_audit_logs           | sys_audit_logs_deny_update                          | UPDATE    | PERMISSIVE | {authenticated} | false                                                                                                                                                                                                    | null                                                                                                                                   |
| sys_banners              | sys_banners_delete                                  | DELETE    | PERMISSIVE | {authenticated} | is_sys_admin()                                                                                                                                                                                           | null                                                                                                                                   |
| sys_banners              | sys_banners_insert                                  | INSERT    | PERMISSIVE | {authenticated} | null                                                                                                                                                                                                     | is_sys_admin()                                                                                                                         |
| sys_banners              | sys_banners_select                                  | SELECT    | PERMISSIVE | {authenticated} | true                                                                                                                                                                                                     | null                                                                                                                                   |
| sys_banners              | Allow public read access to banners                 | SELECT    | PERMISSIVE | {public}        | (active = true)                                                                                                                                                                                          | null                                                                                                                                   |
| sys_banners              | sys_banners_update                                  | UPDATE    | PERMISSIVE | {authenticated} | is_sys_admin()                                                                                                                                                                                           | is_sys_admin()                                                                                                                         |
| sys_broadcasts           | sys_broadcasts_delete                               | DELETE    | PERMISSIVE | {authenticated} | is_sys_admin()                                                                                                                                                                                           | null                                                                                                                                   |
| sys_broadcasts           | sys_broadcasts_insert                               | INSERT    | PERMISSIVE | {authenticated} | null                                                                                                                                                                                                     | is_sys_admin()                                                                                                                         |
| sys_broadcasts           | sys_broadcasts_select                               | SELECT    | PERMISSIVE | {authenticated} | is_sys_admin()                                                                                                                                                                                           | null                                                                                                                                   |
| sys_broadcasts           | sys_broadcasts_update                               | UPDATE    | PERMISSIVE | {authenticated} | is_sys_admin()                                                                                                                                                                                           | is_sys_admin()                                                                                                                         |
| sys_email_broadcasts     | Allow admin full access to broadcasts               | ALL       | PERMISSIVE | {public}        | ((auth.jwt() ->> 'email'::text) = 'danielidrissa12admin@gmail.com'::text)                                                                                                                                | null                                                                                                                                   |
| sys_email_drafts         | Allow admin full access to drafts                   | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | null                                                                                                                                   |
| sys_feature_flags        | sys_feature_flags_admin_write                       | ALL       | PERMISSIVE | {authenticated} | is_sys_admin()                                                                                                                                                                                           | null                                                                                                                                   |
| sys_feature_flags        | sys_feature_flags_read                              | SELECT    | PERMISSIVE | {authenticated} | true                                                                                                                                                                                                     | null                                                                                                                                   |
| sys_newsletter_logs      | sys_newsletter_delete                               | DELETE    | PERMISSIVE | {authenticated} | is_sys_admin()                                                                                                                                                                                           | null                                                                                                                                   |
| sys_newsletter_logs      | sys_newsletter_insert                               | INSERT    | PERMISSIVE | {authenticated} | null                                                                                                                                                                                                     | is_sys_admin()                                                                                                                         |
| sys_newsletter_logs      | sys_newsletter_select                               | SELECT    | PERMISSIVE | {authenticated} | is_sys_admin()                                                                                                                                                                                           | null                                                                                                                                   |
| sys_newsletter_logs      | sys_newsletter_update                               | UPDATE    | PERMISSIVE | {authenticated} | is_sys_admin()                                                                                                                                                                                           | is_sys_admin()                                                                                                                         |
| sys_page_views           | Anyone can insert page views                        | INSERT    | PERMISSIVE | {public}        | null                                                                                                                                                                                                     | true                                                                                                                                   |
| sys_page_views           | System admins can read page views                   | SELECT    | PERMISSIVE | {authenticated} | ((auth.jwt() ->> 'email'::text) = 'danielidrissa12admin@gmail.com'::text)                                                                                                                                | null                                                                                                                                   |
| sys_popups               | sys_popups_select                                   | SELECT    | PERMISSIVE | {authenticated} | ((active = true) OR is_sys_admin())                                                                                                                                                                      | null                                                                                                                                   |
| sys_pricing_plans        | Allow admin write access to pricing plans           | ALL       | PERMISSIVE | {public}        | ((auth.jwt() ->> 'email'::text) = 'danielidrissa12admin@gmail.com'::text)                                                                                                                                | null                                                                                                                                   |
| sys_pricing_plans        | Allow public read access to pricing plans           | SELECT    | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | null                                                                                                                                   |
| sys_rate_limits          | sys_rate_limits_deny_delete                         | DELETE    | PERMISSIVE | {authenticated} | false                                                                                                                                                                                                    | null                                                                                                                                   |
| sys_rate_limits          | sys_rate_limits_deny_insert                         | INSERT    | PERMISSIVE | {authenticated} | null                                                                                                                                                                                                     | false                                                                                                                                  |
| sys_rate_limits          | sys_rate_limits_sysadmin                            | SELECT    | PERMISSIVE | {authenticated} | is_sys_admin()                                                                                                                                                                                           | null                                                                                                                                   |
| sys_rate_limits          | sys_rate_limits_deny_update                         | UPDATE    | PERMISSIVE | {authenticated} | false                                                                                                                                                                                                    | null                                                                                                                                   |
| sys_scheduled_toasts     | Allow admin full access to toasts                   | ALL       | PERMISSIVE | {public}        | ((auth.jwt() ->> 'email'::text) = 'danielidrissa12admin@gmail.com'::text)                                                                                                                                | null                                                                                                                                   |
| sys_scheduled_toasts     | Allow public read access to active toasts           | SELECT    | PERMISSIVE | {public}        | ((scheduled_at <= now()) AND ((expires_at IS NULL) OR (expires_at > now())))                                                                                                                             | null                                                                                                                                   |
| sys_security_events      | sys_security_events_select                          | SELECT    | PERMISSIVE | {authenticated} | is_sys_admin()                                                                                                                                                                                           | null                                                                                                                                   |
| sys_security_events      | sys_security_events_admin_select                    | SELECT    | PERMISSIVE | {authenticated} | is_sys_admin()                                                                                                                                                                                           | null                                                                                                                                   |
| sys_settings             | sys_settings_delete                                 | DELETE    | PERMISSIVE | {authenticated} | is_sys_admin()                                                                                                                                                                                           | null                                                                                                                                   |
| sys_settings             | sys_settings_insert                                 | INSERT    | PERMISSIVE | {authenticated} | null                                                                                                                                                                                                     | is_sys_admin()                                                                                                                         |
| sys_settings             | sys_settings_select                                 | SELECT    | PERMISSIVE | {authenticated} | true                                                                                                                                                                                                     | null                                                                                                                                   |
| sys_settings             | Allow public read access to settings                | SELECT    | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | null                                                                                                                                   |
| sys_settings             | sys_settings_update                                 | UPDATE    | PERMISSIVE | {authenticated} | is_sys_admin()                                                                                                                                                                                           | is_sys_admin()                                                                                                                         |
| sys_step_up_sessions     | sys_step_up_deny_delete                             | DELETE    | PERMISSIVE | {authenticated} | false                                                                                                                                                                                                    | null                                                                                                                                   |
| sys_step_up_sessions     | sys_step_up_deny_insert                             | INSERT    | PERMISSIVE | {authenticated} | null                                                                                                                                                                                                     | false                                                                                                                                  |
| sys_step_up_sessions     | sys_step_up_select                                  | SELECT    | PERMISSIVE | {authenticated} | (user_id = auth.uid())                                                                                                                                                                                   | null                                                                                                                                   |
| sys_step_up_sessions     | sys_step_up_deny_update                             | UPDATE    | PERMISSIVE | {authenticated} | false                                                                                                                                                                                                    | null                                                                                                                                   |
| sys_tickets              | Allow admin read/write access to tickets            | ALL       | PERMISSIVE | {public}        | ((auth.jwt() ->> 'email'::text) = 'danielidrissa12admin@gmail.com'::text)                                                                                                                                | null                                                                                                                                   |
| sys_tickets              | Allow public inserts to tickets                     | INSERT    | PERMISSIVE | {public}        | null                                                                                                                                                                                                     | true                                                                                                                                   |
| sys_toasts               | sys_toasts_select                                   | SELECT    | PERMISSIVE | {authenticated} | ((active = true) OR is_sys_admin())                                                                                                                                                                      | null                                                                                                                                   |
| task_comments            | Allow insert task_comments                          | INSERT    | PERMISSIVE | {public}        | null                                                                                                                                                                                                     | true                                                                                                                                   |
| task_comments            | Allow read task_comments                            | SELECT    | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | null                                                                                                                                   |
| task_tags                | anon full access tasks                              | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| tasks                    | Strict tasks access                                 | ALL       | PERMISSIVE | {public}        | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE ((branches.owner_id = auth.uid()) OR (branches.manager_id = auth.uid()))))                                                                   | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE ((branches.owner_id = auth.uid()) OR (branches.manager_id = auth.uid())))) |
| tasks                    | Public Access                                       | ALL       | PERMISSIVE | {public}        | true                                                                                                                                                                                                     | true                                                                                                                                   |
| tasks                    | tasks_delete                                        | DELETE    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | null                                                                                                                                   |
| tasks                    | tasks_insert                                        | INSERT    | PERMISSIVE | {authenticated} | null                                                                                                                                                                                                     | user_has_branch_access(branch_id)                                                                                                      |
| tasks                    | tasks_select                                        | SELECT    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | null                                                                                                                                   |
| tasks                    | tasks_update                                        | UPDATE    | PERMISSIVE | {authenticated} | user_has_branch_access(branch_id)                                                                                                                                                                        | user_has_branch_access(branch_id)                                                                                                      |

**PART 3**
| table_name        | risk                                       |
| ----------------- | ------------------------------------------ |
| customer_payments | ⚠️ RLS ON, NO POLICIES — all access denied |
| notifications     | ⚠️ RLS ON, NO POLICIES — all access denied |

**PART 04**
ONLY RETURNED THIS : Success. No rows returned

**PART 05**
| function_name                           | arguments                                                                                                                                                                                                                                                                                                                                          | search_path_status | raw_config                         | function_body_preview                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| assign_branch_manager                   | p_branch_id uuid, p_manager_id uuid                                                                                                                                                                                                                                                                                                                | ✅ set              | ["search_path=public, pg_catalog"] | CREATE OR REPLACE FUNCTION public.assign_branch_manager(p_branch_id uuid, p_manager_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_old_manager uuid;
BEGIN
    SELECT manager_id INTO v_old_manager
      FROM public.branches
     WHERE id = p_branch_id
       AND owner_id = auth.uid()
       AND status IS DISTINCT FROM 'deleted';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unauthorized: Only the br |
| assign_branch_manager                   | p_branch_id uuid, p_manager_id uuid, p_manager_email text DEFAULT NULL::text                                                                                                                                                                                                                                                                       | ✅ set              | ["search_path=public, pg_temp"]    | CREATE OR REPLACE FUNCTION public.assign_branch_manager(p_branch_id uuid, p_manager_id uuid, p_manager_email text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    PERFORM public.check_server_maintenance_status();

    IF NOT public.user_has_branch_access(p_branch_id) THEN
        RAISE EXCEPTION 'Unauthorized branch access';
    END IF;

    PERFORM set_config('app.authorized_operation', 'assign_branc |
| check_branch_creation_limits            |                                                                                                                                                                                                                                                                                                                                                    | ✅ set              | ["search_path=public, pg_catalog"] | CREATE OR REPLACE FUNCTION public.check_branch_creation_limits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_plan           text;
    v_max_branches   integer;
    v_current_count  integer;
BEGIN
    -- Only the owner can create a branch for themselves
    IF auth.uid() <> NEW.owner_id AND NOT public.is_sys_admin() THEN
        RAISE EXCEPTION 'Unauthorized: You cannot create a branch for another tenant.';
  |
| check_branch_mutations                  |                                                                                                                                                                                                                                                                                                                                                    | ✅ set              | ["search_path=public, pg_catalog"] | CREATE OR REPLACE FUNCTION public.check_branch_mutations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_auth_op text;
BEGIN
    v_auth_op := current_setting('app.authorized_operation', true);

    -- Owner ID may never change through client DML
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
        RAISE EXCEPTION 'Security violation: Branch owner_id cannot be changed.';
    END IF;

    -- Manager  |
| check_central_inventory_mutations       |                                                                                                                                                                                                                                                                                                                                                    | ✅ set              | ["search_path=public, pg_catalog"] | CREATE OR REPLACE FUNCTION public.check_central_inventory_mutations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_op text;
BEGIN
    IF public.is_sys_admin() THEN RETURN NEW; END IF;

    v_op := current_setting('app.authorized_operation', true);

    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Audit violation: Deletion of central inventory items is blocked. Use soft-deletion (is_active = false).';
   |
| check_inventory_mutations               |                                                                                                                                                                                                                                                                                                                                                    | ✅ set              | ["search_path=public, pg_catalog"] | CREATE OR REPLACE FUNCTION public.check_inventory_mutations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_op      text;
    v_is_owner boolean;
BEGIN
    -- SysAdmin may perform any direct correction
    IF public.is_sys_admin() THEN RETURN NEW; END IF;

    v_op := current_setting('app.authorized_operation', true);

    IF TG_OP = 'DELETE' THEN
        IF v_op IS DISTINCT FROM 'admin_delete_inventory' THE |
| check_profile_mutations                 |                                                                                                                                                                                                                                                                                                                                                    | ✅ set              | ["search_path=public, pg_catalog"] | CREATE OR REPLACE FUNCTION public.check_profile_mutations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
    -- Only self-edit or sysadmin
    IF auth.uid() <> NEW.id AND NOT public.is_sys_admin() THEN
        RAISE EXCEPTION 'Unauthorized: You cannot modify another user''s profile.';
    END IF;

    -- Clients cannot touch billing/entitlement fields — only sysadmin via direct SQL
    IF NOT public.is_sys_admin() THE |
| check_rate_limit                        | p_action text                                                                                                                                                                                                                                                                                                                                      | ✅ set              | ["search_path=public, pg_temp"]    | CREATE OR REPLACE FUNCTION public.check_rate_limit(p_action text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_identifier TEXT;
    v_limit INTEGER;
    v_window_seconds INTEGER;
    v_current_hits INTEGER;
    v_extracted_ip TEXT;
BEGIN
    IF p_action IS NULL OR length(trim(p_action)) = 0 THEN
        RAISE EXCEPTION 'Rate limit action name is required';
    END IF;

    CAS |
| check_server_maintenance_status         |                                                                                                                                                                                                                                                                                                                                                    | ✅ set              | ["search_path=public, pg_temp"]    | CREATE OR REPLACE FUNCTION public.check_server_maintenance_status()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_is_maintenance BOOLEAN := false;
BEGIN
    SELECT (value = 'true') INTO v_is_maintenance
    FROM public.sys_settings
    WHERE key = 'maintenance_mode';

    IF v_is_maintenance AND NOT public.is_sys_admin() THEN
        RAISE EXCEPTION 'System is currently under maintenance. Non-administrator access is |
| confirm_step_up_reauth                  | p_action text DEFAULT 'global_admin'::text                                                                                                                                                                                                                                                                                                         | ✅ set              | ["search_path=public, pg_temp"]    | CREATE OR REPLACE FUNCTION public.confirm_step_up_reauth(p_action text DEFAULT 'global_admin'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_expires TIMESTAMPTZ := v_now + INTERVAL '5 minutes';
BEGIN
    IF NOT public.is_sys_admin() THEN
        RAISE EXCEPTION 'Access denied: System Administrator only';
    END IF;

    IF NOT public.is_mfa_authenticated() THEN
        RAIS |
| create_branch_item                      | p_branch_id uuid, p_item_name text, p_sku text, p_category text, p_price numeric, p_cost_price numeric DEFAULT 0, p_wholesale_price numeric DEFAULT 0, p_quantity numeric DEFAULT 0, p_reorder_level numeric DEFAULT 0, p_unit text DEFAULT 'pcs'::text                                                                                            | ✅ set              | ["search_path=public, pg_temp"]    | CREATE OR REPLACE FUNCTION public.create_branch_item(p_branch_id uuid, p_item_name text, p_sku text, p_category text, p_price numeric, p_cost_price numeric DEFAULT 0, p_wholesale_price numeric DEFAULT 0, p_quantity numeric DEFAULT 0, p_reorder_level numeric DEFAULT 0, p_unit text DEFAULT 'pcs'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_item_id UUID;
BEGIN
    PERFORM public.check_server_maintenance_status();

 |
| create_branch_item                      | p_branch_id uuid, p_name text, p_sku text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_price numeric DEFAULT 0, p_cost_price numeric DEFAULT 0, p_min_threshold integer DEFAULT 5, p_retail_price numeric DEFAULT NULL::numeric, p_wholesale_price numeric DEFAULT NULL::numeric, p_unit text DEFAULT NULL::text                      | ✅ set              | ["search_path=public, pg_catalog"] | CREATE OR REPLACE FUNCTION public.create_branch_item(p_branch_id uuid, p_name text, p_sku text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_price numeric DEFAULT 0, p_cost_price numeric DEFAULT 0, p_min_threshold integer DEFAULT 5, p_retail_price numeric DEFAULT NULL::numeric, p_wholesale_price numeric DEFAULT NULL::numeric, p_unit text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_owne |
| create_branch_manager                   | mgr_email text, mgr_password text, mgr_meta jsonb                                                                                                                                                                                                                                                                                                  | ✅ set              | ["search_path=public"]             | CREATE OR REPLACE FUNCTION public.create_branch_manager(mgr_email text, mgr_password text, mgr_meta jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO new_user_id FROM auth.users WHERE email = mgr_email;
  
  IF new_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET 
      encrypted_password = extensions.crypt(mgr_password, extensions.gen_salt('bf')) |
| create_central_item                     | p_name text, p_sku text, p_category text DEFAULT NULL::text, p_price numeric DEFAULT 0, p_cost_price numeric DEFAULT 0, p_min_threshold integer DEFAULT 5, p_supplier_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text, p_requires_approval boolean DEFAULT false                                                                 | ✅ set              | ["search_path=public, pg_catalog"] | CREATE OR REPLACE FUNCTION public.create_central_item(p_name text, p_sku text, p_category text DEFAULT NULL::text, p_price numeric DEFAULT 0, p_cost_price numeric DEFAULT 0, p_min_threshold integer DEFAULT 5, p_supplier_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text, p_requires_approval boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_owner_id    uuid;
    v_inserted    public.ce |
| create_central_item                     | p_name text, p_sku text, p_category text, p_price numeric, p_cost_price numeric DEFAULT 0, p_wholesale_price numeric DEFAULT 0, p_main_store_stock numeric DEFAULT 0, p_reorder_level numeric DEFAULT 0, p_unit text DEFAULT 'pcs'::text                                                                                                           | ✅ set              | ["search_path=public, pg_temp"]    | CREATE OR REPLACE FUNCTION public.create_central_item(p_name text, p_sku text, p_category text, p_price numeric, p_cost_price numeric DEFAULT 0, p_wholesale_price numeric DEFAULT 0, p_main_store_stock numeric DEFAULT 0, p_reorder_level numeric DEFAULT 0, p_unit text DEFAULT 'pcs'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_owner_id UUID := auth.uid();
    v_item_id UUID;
BEGIN
    PERFORM public.check_server_ma |
| create_sale                             | p_branch_id uuid, p_customer text, p_items text, p_amount numeric, p_payment text, p_product_id uuid DEFAULT NULL::uuid, p_qty integer DEFAULT 1, p_price_type text DEFAULT 'retail'::text, p_client_tx_id uuid DEFAULT NULL::uuid                                                                                                                 | ✅ set              | ["search_path=public, pg_catalog"] | CREATE OR REPLACE FUNCTION public.create_sale(p_branch_id uuid, p_customer text, p_items text, p_amount numeric, p_payment text, p_product_id uuid DEFAULT NULL::uuid, p_qty integer DEFAULT 1, p_price_type text DEFAULT 'retail'::text, p_client_tx_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_owner_id          uuid;
    v_inv               record;
    v_unit_cost         numeric := 0;
    v |
| create_sale                             | p_branch_id uuid, p_items jsonb, p_payment_method text DEFAULT 'cash'::text, p_customer_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_price_type text DEFAULT 'retail'::text, p_client_tx_id uuid DEFAULT NULL::uuid                                                                                                              | ✅ set              | ["search_path=public, pg_temp"]    | CREATE OR REPLACE FUNCTION public.create_sale(p_branch_id uuid, p_items jsonb, p_payment_method text DEFAULT 'cash'::text, p_customer_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_price_type text DEFAULT 'retail'::text, p_client_tx_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_owner_id UUID;
    v_user_id UUID;
    v_sale_id UUID;
    v_total_amount NUMERIC(15,2) := 0;
     |
| create_sys_broadcast                    | p_title text, p_body text, p_message_type text, p_priority text, p_target_type text, p_target_id uuid DEFAULT NULL::uuid, p_target_role text DEFAULT NULL::text, p_channels jsonb DEFAULT '["in_app"]'::jsonb, p_scheduled_at timestamp with time zone DEFAULT now(), p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone | ✅ set              | ["search_path=public, pg_temp"]    | CREATE OR REPLACE FUNCTION public.create_sys_broadcast(p_title text, p_body text, p_message_type text, p_priority text, p_target_type text, p_target_id uuid DEFAULT NULL::uuid, p_target_role text DEFAULT NULL::text, p_channels jsonb DEFAULT '["in_app"]'::jsonb, p_scheduled_at timestamp with time zone DEFAULT now(), p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 |
| dispatch_central_stock                  | p_central_item_id uuid, p_branch_id uuid, p_qty integer, p_notes text DEFAULT NULL::text                                                                                                                                                                                                                                                           | ✅ set              | ["search_path=public, pg_catalog"] | CREATE OR REPLACE FUNCTION public.dispatch_central_stock(p_central_item_id uuid, p_branch_id uuid, p_qty integer, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_item          record;
    v_branch_owner  uuid;
    v_branch_inv_id uuid;
BEGIN
    -- ── Input validation ──────────────────────────────────────────────────────
    IF p_qty IS NULL OR p_qty <= 0 OR p_qty > 100000 THEN
  |
| dispatch_central_stock                  | p_central_item_id uuid, p_target_branch_id uuid, p_quantity numeric, p_notes text DEFAULT NULL::text                                                                                                                                                                                                                                               | ✅ set              | ["search_path=public, pg_temp"]    | CREATE OR REPLACE FUNCTION public.dispatch_central_stock(p_central_item_id uuid, p_target_branch_id uuid, p_quantity numeric, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_central RECORD;
    v_branch RECORD;
    v_inv_id UUID;
BEGIN
    PERFORM public.check_server_maintenance_status();

    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized: U |
| emergency_lockout_account               | target_id uuid, target_type text, lock_reason text DEFAULT 'Security Emergency'::text                                                                                                                                                                                                                                                              | ✅ set              | ["search_path=public"]             | CREATE OR REPLACE FUNCTION public.emergency_lockout_account(target_id uuid, target_type text, lock_reason text DEFAULT 'Security Emergency'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- SysAdmin-only guard
    IF NOT public.is_sys_admin() THEN
        RAISE EXCEPTION 'Access denied: System Administrator only';
    END IF;

    IF target_type = 'BSO' THEN
        -- Lock profile status
        UPDATE public.profiles
  |
| emergency_lockout_tenant                | target_owner_id uuid, lock_reason text DEFAULT 'Security Emergency'::text                                                                                                                                                                                                                                                                          | ✅ set              | ["search_path=public"]             | CREATE OR REPLACE FUNCTION public.emergency_lockout_tenant(target_owner_id uuid, lock_reason text DEFAULT 'Security Emergency'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- ── SysAdmin-only guard ──────────────────────────────────────────────────
    IF NOT public.is_sys_admin() THEN
        RAISE EXCEPTION 'Access denied: System Administrator only';
    END IF;
    -- ──────────────────────────────────────────────────── |
| export_tenant_compliance_data           | target_owner_id uuid                                                                                                                                                                                                                                                                                                                               | ✅ set              | ["search_path=public"]             | CREATE OR REPLACE FUNCTION public.export_tenant_compliance_data(target_owner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_profile JSONB;
    v_branches JSONB;
    v_sales JSONB;
    v_inventory JSONB;
    v_expenses JSONB;
    v_staff JSONB;
    v_result JSONB;
BEGIN
    -- ── SysAdmin-only guard ──────────────────────────────────────────────────
    IF NOT public.is_sys_admin() THEN
        RAISE EXCEPTION 'Acce |
| get_all_user_accounts                   |                                                                                                                                                                                                                                                                                                                                                    | ✅ set              | ["search_path=public"]             | CREATE OR REPLACE FUNCTION public.get_all_user_accounts()
 RETURNS TABLE(id uuid, email text, name text, account_type text, plan text, status text, last_login timestamp with time zone, parent_owner_email text, branch_name text, location text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- SysAdmin-only guard
    IF NOT public.is_sys_admin() THEN
        RAISE EXCEPTION 'Access denied: System Administrator only';
    END IF;

    RETURN QUERY
  |
| get_branch_profit_stats                 | p_branch_id uuid                                                                                                                                                                                                                                                                                                                                   | ⚠️ NOT set         | null                               | CREATE OR REPLACE FUNCTION public.get_branch_profit_stats(p_branch_id uuid)
 RETURNS TABLE(gross_profit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM((s.amount / GREATEST(s.quantity, 1) - COALESCE(i.cost_price, 0)) * s.quantity), 0) as gross_profit
    FROM sales s
    LEFT JOIN inventory i ON s.product_id = i.id
    WHERE s.branch_id = p_branch_id;
END;
$function$
                                                        |
| get_branch_sales_summary                | p_branch_id uuid, p_today_start timestamp with time zone                                                                                                                                                                                                                                                                                           | ⚠️ NOT set         | null                               | CREATE OR REPLACE FUNCTION public.get_branch_sales_summary(p_branch_id uuid, p_today_start timestamp with time zone)
 RETURNS TABLE(today_total numeric, transaction_count bigint, avg_sale numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(amount), 0) as today_total,
        COUNT(id) as transaction_count,
        CASE 
            WHEN COUNT(id) > 0 THEN COALESCE(SUM(amount) / COUNT(id), 0) 
            ELSE 0 
        END a |
| get_compiled_ai_system_prompt           | p_user_id uuid, p_message text                                                                                                                                                                                                                                                                                                                     | ✅ set              | ["search_path=public, pg_catalog"] | CREATE OR REPLACE FUNCTION public.get_compiled_ai_system_prompt(p_user_id uuid, p_message text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_context           jsonb;
    v_role              text;
    v_plan              text;
    v_scope             text;
    v_ai_access         boolean;
    v_tenant_name       text;
    v_branch_name       text;
    v_features          text[];

    v_msg_lower         text;
 |
| get_current_tenant_id                   |                                                                                                                                                                                                                                                                                                                                                    | ✅ set              | ["search_path=public, pg_catalog"] | CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_tenant_id   uuid;
    v_branch_count integer;
BEGIN
    IF public.is_sys_admin() THEN
        RETURN NULL;  -- SysAdmin is tenant-neutral; never auto-scoped
    END IF;

    -- Check manager first (explicit role check, not profile existence)
    IF public.is_branch_manager(auth.uid()) THEN
        SELECT COUN |
| get_platform_revenue_analytics          |                                                                                                                                                                                                                                                                                                                                                    | ✅ set              | ["search_path=public"]             | CREATE OR REPLACE FUNCTION public.get_platform_revenue_analytics()
 RETURNS TABLE(total_tenants bigint, paid_subscribers bigint, trial_subscribers bigint, starter_count bigint, enterprise_count bigint, exclusive_count bigint, estimated_mrr numeric, estimated_arr numeric, trial_conversions bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_starter_price NUMERIC := 5000;
    v_enterprise_price NUMERIC := 15000;
    v_exclusive_price NUMERIC :=  |
| get_tenant_health_metrics               |                                                                                                                                                                                                                                                                                                                                                    | ✅ set              | ["search_path=public"]             | CREATE OR REPLACE FUNCTION public.get_tenant_health_metrics()
 RETURNS TABLE(owner_id uuid, full_name text, email text, plan text, branch_count bigint, max_branches integer, sales_count bigint, inventory_count bigint, expenses_count bigint, audit_count bigint, last_active timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- ── SysAdmin-only guard ──────────────────────────────────────────────────
    IF NOT public.is_sys_admin() |
| is_branch_manager                       | p_user_id uuid                                                                                                                                                                                                                                                                                                                                     | ✅ set              | ["search_path=public, pg_catalog"] | CREATE OR REPLACE FUNCTION public.is_branch_manager(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.branches
        WHERE manager_id = p_user_id
          AND status IS DISTINCT FROM 'deleted'
    );
END;
$function$
                                                                                                                                               |
| is_subscription_active                  | p_owner_id uuid                                                                                                                                                                                                                                                                                                                                    | ✅ set              | ["search_path=public, pg_temp"]    | CREATE OR REPLACE FUNCTION public.is_subscription_active(p_owner_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    RETURN TRUE;
END;
$function$
                                                                                                                                                                                                                                                                                     |
| is_sys_admin                            |                                                                                                                                                                                                                                                                                                                                                    | ✅ set              | ["search_path=public, pg_temp"]    | CREATE OR REPLACE FUNCTION public.is_sys_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    IF auth.uid() IS NULL THEN RETURN FALSE; END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.sys_admins WHERE user_id = auth.uid()
    );
END;
$function$
                                                                                                                                                                       |
| log_admin_action                        | p_action text, p_details jsonb DEFAULT '{}'::jsonb, p_severity text DEFAULT 'info'::text                                                                                                                                                                                                                                                           | ✅ set              | ["search_path=public, pg_temp"]    | CREATE OR REPLACE FUNCTION public.log_admin_action(p_action text, p_details jsonb DEFAULT '{}'::jsonb, p_severity text DEFAULT 'info'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_log_id UUID;
    v_client_ip TEXT;
BEGIN
    IF NOT public.is_sys_admin() THEN
        RAISE EXCEPTION 'Access denied: System Administrator only';
    END IF;

    v_client_ip := public.extract_trusted_client_ip();

    INSERT INT |
| log_ai_request                          | p_user_id uuid, p_role text, p_plan text, p_scope text, p_msg_length integer, p_admin_intent boolean DEFAULT false                                                                                                                                                                                                                                 | ✅ set              | ["search_path=public, pg_catalog"] | CREATE OR REPLACE FUNCTION public.log_ai_request(p_user_id uuid, p_role text, p_plan text, p_scope text, p_msg_length integer, p_admin_intent boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
    INSERT INTO public.sys_security_events
        (event_type, severity, user_id, metadata)
    VALUES (
        'AI_REQUEST',
        CASE WHEN p_admin_intent THEN 'warning' ELSE 'info' END,
        p_user_id,
   |
| prevent_stock_movement_mutation         |                                                                                                                                                                                                                                                                                                                                                    | ✅ set              | ["search_path=public, pg_catalog"] | CREATE OR REPLACE FUNCTION public.prevent_stock_movement_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
    IF NOT public.is_sys_admin() THEN
        RAISE EXCEPTION 'Audit violation: Stock movement records are append-only.';
    END IF;
    RETURN NEW;
END;
$function$
                                                                                                                                                |
| publish_due_broadcasts                  |                                                                                                                                                                                                                                                                                                                                                    | ✅ set              | ["search_path=public, pg_temp"]    | CREATE OR REPLACE FUNCTION public.publish_due_broadcasts()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_broadcast RECORD;
    v_published_count INTEGER := 0;
    v_recipients_inserted INTEGER := 0;
BEGIN
    FOR v_broadcast IN
        SELECT * FROM public.sys_broadcasts
        WHERE status = 'scheduled' AND scheduled_at <= NOW()
        FOR UPDATE
    LOOP
        UPDATE public.sys_broadcasts
        SET sta |
| reset_branch_manager_password           | mgr_id uuid, new_password text                                                                                                                                                                                                                                                                                                                     | ✅ set              | ["search_path=public"]             | CREATE OR REPLACE FUNCTION public.reset_branch_manager_password(mgr_id uuid, new_password text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE auth.users
  SET 
    encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
    updated_at = now()
  WHERE id = mgr_id;
END;
$function$
                                                                                                                               |
| resolve_ai_context                      | p_user_id uuid                                                                                                                                                                                                                                                                                                                                     | ✅ set              | ["search_path=public, pg_catalog"] | CREATE OR REPLACE FUNCTION public.resolve_ai_context(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_role          text;
    v_plan          text;
    v_trial_ends    timestamptz;
    v_status        text;
    v_is_suspended  boolean;
    v_sub_active    boolean;
    v_tenant_id     uuid;
    v_tenant_name   text;
    v_branch_id     uuid;
    v_branch_name   text;
    v_features      text[];
  |
| rls_auto_enable                         |                                                                                                                                                                                                                                                                                                                                                    | ✅ set              | ["search_path=pg_catalog"]         | CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog |
| sync_branch_inventory_on_central_update |                                                                                                                                                                                                                                                                                                                                                    | ✅ set              | ["search_path=public, pg_catalog"] | CREATE OR REPLACE FUNCTION public.sync_branch_inventory_on_central_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
    UPDATE public.inventory
       SET name            = NEW.name,
           sku             = NEW.sku,
           category        = NEW.category,
           price           = COALESCE(NEW.price, 0),
           cost_price      = COALESCE(NEW.cost_price, 0),
           retail_price    = COALESCE(NEW |
| tenant_has_feature                      | p_owner_id uuid, p_feature text                                                                                                                                                                                                                                                                                                                    | ✅ set              | ["search_path=public, pg_catalog"] | CREATE OR REPLACE FUNCTION public.tenant_has_feature(p_owner_id uuid, p_feature text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_plan text;
    v_trial_ends timestamptz;
BEGIN
    SELECT plan, trial_ends_at INTO v_plan, v_trial_ends
      FROM public.profiles WHERE id = p_owner_id;

    IF NOT FOUND THEN RETURN false; END IF;

    -- Active free trial → full feature access (mirrors frontend behaviour)
    |
| toggle_sys_feature_flag                 | p_key text, p_enabled boolean                                                                                                                                                                                                                                                                                                                      | ✅ set              | ["search_path=public"]             | CREATE OR REPLACE FUNCTION public.toggle_sys_feature_flag(p_key text, p_enabled boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- ── SysAdmin-only guard ──────────────────────────────────────────────────
    IF NOT public.is_sys_admin() THEN
        RAISE EXCEPTION 'Access denied: System Administrator only';
    END IF;
    -- ────────────────────────────────────────────────────────────────────────

    UPDATE public.sys |
| unlock_account                          | target_id uuid, target_type text                                                                                                                                                                                                                                                                                                                   | ✅ set              | ["search_path=public"]             | CREATE OR REPLACE FUNCTION public.unlock_account(target_id uuid, target_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- SysAdmin-only guard
    IF NOT public.is_sys_admin() THEN
        RAISE EXCEPTION 'Access denied: System Administrator only';
    END IF;

    IF target_type = 'BSO' THEN
        -- Unlock profile status
        UPDATE public.profiles
        SET status = 'active',
            updated_at = NOW()
 |
| unlock_tenant                           | target_owner_id uuid                                                                                                                                                                                                                                                                                                                               | ✅ set              | ["search_path=public"]             | CREATE OR REPLACE FUNCTION public.unlock_tenant(target_owner_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- ── SysAdmin-only guard ──────────────────────────────────────────────────
    IF NOT public.is_sys_admin() THEN
        RAISE EXCEPTION 'Access denied: System Administrator only';
    END IF;
    -- ────────────────────────────────────────────────────────────────────────

    UPDATE public.profiles
    SET stat |
| update_notification_receipt_status      | p_notification_id uuid, p_status text                                                                                                                                                                                                                                                                                                              | ✅ set              | ["search_path=public, pg_temp"]    | CREATE OR REPLACE FUNCTION public.update_notification_receipt_status(p_notification_id uuid, p_status text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_rows_updated INTEGER := 0;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    IF p_status NOT IN ('seen', 'dismissed') THEN RAISE EXCEPTION 'Invalid receipt status'; END IF;

    UPDATE public.notification_recipients
    SET delivery |
| user_has_branch_access                  | p_branch_id uuid                                                                                                                                                                                                                                                                                                                                   | ✅ set              | ["search_path=public, pg_temp"]    | CREATE OR REPLACE FUNCTION public.user_has_branch_access(p_branch_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
    IF EXISTS (SELECT 1 FROM public.sys_admins WHERE user_id = auth.uid()) THEN RETURN TRUE; END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.branches b
        WHERE b.id = p_branch_id AND (b.owner_id = auth.uid() OR b.manager_id = auth.uid())
 |
| verify_step_up_reauth                   | p_action text                                                                                                                                                                                                                                                                                                                                      | ✅ set              | ["search_path=public, pg_temp"]    | CREATE OR REPLACE FUNCTION public.verify_step_up_reauth(p_action text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_has_fresh_step_up BOOLEAN;
BEGIN
    IF NOT public.is_sys_admin() THEN
        RAISE EXCEPTION 'Access denied: System Administrator only';
    END IF;

    IF NOT public.is_mfa_authenticated() THEN
        RAISE EXCEPTION 'Step-up security violation: AAL2 Multi-Factor Authentication session require |
| verify_sys_admin                        | input_keyword text                                                                                                                                                                                                                                                                                                                                 | ✅ set              | ["search_path=public"]             | CREATE OR REPLACE FUNCTION public.verify_sys_admin(input_keyword text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.sys_settings 
        WHERE key = 'admin_keyword' AND value = input_keyword
    ) AND public.is_sys_admin();
END;
$function$
                                                                                                                                                   |
**PART 06**
| tablename            | policyname                                          | cmd    | using_clause                                                                                   | risk                                                                         |
| -------------------- | --------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| access_requests      | Owners can update requests                          | UPDATE | (auth.uid() = owner_id)                                                                        | ⚠️ UPDATE policy missing WITH CHECK — tenant_id reassignment may be possible |
| inventory_purchases  | Allow owners to update purchases for their branches | UPDATE | (branch_id IN ( SELECT branches.id
   FROM branches
  WHERE (branches.owner_id = auth.uid()))) | ⚠️ UPDATE policy missing WITH CHECK — tenant_id reassignment may be possible |
| profiles             | Users can update own profile                        | UPDATE | (auth.uid() = id)                                                                              | ⚠️ UPDATE policy missing WITH CHECK — tenant_id reassignment may be possible |
| sys_admins           | sys_admins_deny_update                              | UPDATE | false                                                                                          | ⚠️ UPDATE policy missing WITH CHECK — tenant_id reassignment may be possible |
| sys_audit_logs       | sys_audit_logs_deny_update                          | UPDATE | false                                                                                          | ⚠️ UPDATE policy missing WITH CHECK — tenant_id reassignment may be possible |
| sys_rate_limits      | sys_rate_limits_deny_update                         | UPDATE | false                                                                                          | ⚠️ UPDATE policy missing WITH CHECK — tenant_id reassignment may be possible |
| sys_step_up_sessions | sys_step_up_deny_update                             | UPDATE | false                                                                                          | ⚠️ UPDATE policy missing WITH CHECK — tenant_id reassignment may be possible |

**PART 07a**
| grantee       | table_name               | privileges                                                    |
| ------------- | ------------------------ | ------------------------------------------------------------- |
| anon          | access_logs              | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | access_requests          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | agent_knowledge          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | announcement_dismissals  | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | announcements            | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | archived_conversations   | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | attendance               | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | branch_inventory         | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | branches                 | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | cash_drawer              | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | cash_transactions        | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | central_inventory        | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | chat_groups              | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | customer_payments        | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | customer_tags            | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | customers                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | dashboard_dismissals     | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | document_items           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | documents                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | exchange_rates           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | expense_tags             | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | expenses                 | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | goals                    | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | group_members            | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | inventory                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | inventory_purchases      | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | inventory_tags           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | loan_tags                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | loans                    | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | loyalty_transactions     | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | messages                 | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | note_tags                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | notes                    | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | notification_preferences | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | notification_reads       | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | notification_recipients  | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | notifications            | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | payroll                  | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | pinned_messages          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | po_items                 | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | product_returns          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | profiles                 | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | promotions               | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | purchase_orders          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | quotation_items          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | quotations               | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | requests                 | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | saas_audit_logs          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sale_tags                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sales                    | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | shifts                   | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | staff                    | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | starred_messages         | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | stock_movements          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | stock_transfers          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | suppliers                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | support_requests         | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_admins               | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_ai_chat_messages     | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_ai_prompts           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_audit_logs           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_banners              | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_broadcasts           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_email_broadcasts     | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_email_drafts         | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_feature_flags        | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_newsletter_logs      | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_page_views           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_popups               | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_pricing_plans        | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_rate_limits          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_scheduled_toasts     | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_security_events      | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_settings             | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_step_up_sessions     | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_tickets              | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | sys_toasts               | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | task_comments            | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | task_tags                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| anon          | tasks                    | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | access_logs              | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | access_requests          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | agent_knowledge          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | announcement_dismissals  | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | announcements            | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | archived_conversations   | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | attendance               | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | branch_inventory         | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | branches                 | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | cash_drawer              | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | cash_transactions        | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | central_inventory        | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | chat_groups              | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | customer_payments        | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | customer_tags            | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | customers                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | dashboard_dismissals     | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | document_items           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | documents                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | exchange_rates           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | expense_tags             | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | expenses                 | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | goals                    | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | group_members            | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | inventory                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | inventory_purchases      | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | inventory_tags           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | loan_tags                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | loans                    | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | loyalty_transactions     | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | messages                 | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | note_tags                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | notes                    | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | notification_preferences | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | notification_reads       | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | notification_recipients  | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | notifications            | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | payroll                  | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | pinned_messages          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | po_items                 | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | product_returns          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | profiles                 | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | promotions               | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | purchase_orders          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | quotation_items          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | quotations               | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | requests                 | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | saas_audit_logs          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sale_tags                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sales                    | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | shifts                   | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | staff                    | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | starred_messages         | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | stock_movements          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | stock_transfers          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | suppliers                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | support_requests         | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_admins               | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_ai_chat_messages     | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_ai_prompts           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_audit_logs           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_banners              | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_broadcasts           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_email_broadcasts     | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_email_drafts         | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_feature_flags        | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_newsletter_logs      | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_page_views           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_popups               | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_pricing_plans        | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_rate_limits          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_scheduled_toasts     | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_security_events      | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_settings             | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_step_up_sessions     | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_tickets              | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | sys_toasts               | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | task_comments            | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | task_tags                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | tasks                    | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | access_logs              | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | access_requests          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | agent_knowledge          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | announcement_dismissals  | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | announcements            | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | archived_conversations   | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | attendance               | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | branch_inventory         | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | branches                 | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | cash_drawer              | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | cash_transactions        | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | central_inventory        | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | chat_groups              | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | customer_payments        | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | customer_tags            | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | customers                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | dashboard_dismissals     | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | document_items           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | documents                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | exchange_rates           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | expense_tags             | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | expenses                 | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | goals                    | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | group_members            | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | inventory                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | inventory_purchases      | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | inventory_tags           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | loan_tags                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | loans                    | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | loyalty_transactions     | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | messages                 | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | note_tags                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | notes                    | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | notification_preferences | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | notification_reads       | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | notification_recipients  | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | notifications            | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | payroll                  | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | pinned_messages          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | po_items                 | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | product_returns          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | profiles                 | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | promotions               | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | purchase_orders          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | quotation_items          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | quotations               | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | requests                 | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | saas_audit_logs          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sale_tags                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sales                    | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | shifts                   | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | staff                    | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | starred_messages         | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | stock_movements          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | stock_transfers          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | suppliers                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | support_requests         | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_admins               | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_ai_chat_messages     | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_ai_prompts           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_audit_logs           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_banners              | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_broadcasts           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_email_broadcasts     | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_email_drafts         | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_feature_flags        | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_newsletter_logs      | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_page_views           | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_popups               | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_pricing_plans        | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_rate_limits          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_scheduled_toasts     | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_security_events      | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_settings             | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_step_up_sessions     | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_tickets              | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | sys_toasts               | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | task_comments            | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | task_tags                | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role  | tasks                    | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

**PART 07b**
| routine_name                            | grantee       | privilege_type |
| --------------------------------------- | ------------- | -------------- |
| assign_branch_manager                   | anon          | EXECUTE        |
| assign_branch_manager                   | anon          | EXECUTE        |
| assign_branch_manager                   | authenticated | EXECUTE        |
| assign_branch_manager                   | authenticated | EXECUTE        |
| assign_branch_manager                   | service_role  | EXECUTE        |
| assign_branch_manager                   | service_role  | EXECUTE        |
| check_branch_creation_limits            | anon          | EXECUTE        |
| check_branch_creation_limits            | authenticated | EXECUTE        |
| check_branch_creation_limits            | service_role  | EXECUTE        |
| check_branch_mutations                  | anon          | EXECUTE        |
| check_branch_mutations                  | authenticated | EXECUTE        |
| check_branch_mutations                  | service_role  | EXECUTE        |
| check_central_inventory_mutations       | anon          | EXECUTE        |
| check_central_inventory_mutations       | authenticated | EXECUTE        |
| check_central_inventory_mutations       | service_role  | EXECUTE        |
| check_inventory_mutations               | anon          | EXECUTE        |
| check_inventory_mutations               | authenticated | EXECUTE        |
| check_inventory_mutations               | service_role  | EXECUTE        |
| check_profile_mutations                 | anon          | EXECUTE        |
| check_profile_mutations                 | authenticated | EXECUTE        |
| check_profile_mutations                 | service_role  | EXECUTE        |
| check_rate_limit                        | anon          | EXECUTE        |
| check_rate_limit                        | authenticated | EXECUTE        |
| check_rate_limit                        | service_role  | EXECUTE        |
| check_server_maintenance_status         | anon          | EXECUTE        |
| check_server_maintenance_status         | authenticated | EXECUTE        |
| check_server_maintenance_status         | service_role  | EXECUTE        |
| confirm_step_up_reauth                  | anon          | EXECUTE        |
| confirm_step_up_reauth                  | authenticated | EXECUTE        |
| confirm_step_up_reauth                  | service_role  | EXECUTE        |
| create_branch_item                      | anon          | EXECUTE        |
| create_branch_item                      | anon          | EXECUTE        |
| create_branch_item                      | authenticated | EXECUTE        |
| create_branch_item                      | authenticated | EXECUTE        |
| create_branch_item                      | service_role  | EXECUTE        |
| create_branch_item                      | service_role  | EXECUTE        |
| create_branch_manager                   | anon          | EXECUTE        |
| create_branch_manager                   | authenticated | EXECUTE        |
| create_branch_manager                   | service_role  | EXECUTE        |
| create_central_item                     | anon          | EXECUTE        |
| create_central_item                     | anon          | EXECUTE        |
| create_central_item                     | authenticated | EXECUTE        |
| create_central_item                     | authenticated | EXECUTE        |
| create_central_item                     | service_role  | EXECUTE        |
| create_central_item                     | service_role  | EXECUTE        |
| create_sale                             | anon          | EXECUTE        |
| create_sale                             | anon          | EXECUTE        |
| create_sale                             | authenticated | EXECUTE        |
| create_sale                             | authenticated | EXECUTE        |
| create_sale                             | service_role  | EXECUTE        |
| create_sale                             | service_role  | EXECUTE        |
| create_sys_broadcast                    | anon          | EXECUTE        |
| create_sys_broadcast                    | authenticated | EXECUTE        |
| create_sys_broadcast                    | service_role  | EXECUTE        |
| dispatch_central_stock                  | anon          | EXECUTE        |
| dispatch_central_stock                  | anon          | EXECUTE        |
| dispatch_central_stock                  | authenticated | EXECUTE        |
| dispatch_central_stock                  | authenticated | EXECUTE        |
| dispatch_central_stock                  | service_role  | EXECUTE        |
| dispatch_central_stock                  | service_role  | EXECUTE        |
| emergency_lockout_account               | anon          | EXECUTE        |
| emergency_lockout_account               | authenticated | EXECUTE        |
| emergency_lockout_account               | service_role  | EXECUTE        |
| emergency_lockout_tenant                | anon          | EXECUTE        |
| emergency_lockout_tenant                | authenticated | EXECUTE        |
| emergency_lockout_tenant                | service_role  | EXECUTE        |
| export_tenant_compliance_data           | anon          | EXECUTE        |
| export_tenant_compliance_data           | authenticated | EXECUTE        |
| export_tenant_compliance_data           | service_role  | EXECUTE        |
| extract_trusted_client_ip               | service_role  | EXECUTE        |
| get_all_user_accounts                   | anon          | EXECUTE        |
| get_all_user_accounts                   | authenticated | EXECUTE        |
| get_all_user_accounts                   | service_role  | EXECUTE        |
| get_branch_profit_stats                 | anon          | EXECUTE        |
| get_branch_profit_stats                 | authenticated | EXECUTE        |
| get_branch_profit_stats                 | service_role  | EXECUTE        |
| get_branch_sales_summary                | anon          | EXECUTE        |
| get_branch_sales_summary                | authenticated | EXECUTE        |
| get_branch_sales_summary                | service_role  | EXECUTE        |
| get_compiled_ai_system_prompt           | anon          | EXECUTE        |
| get_compiled_ai_system_prompt           | authenticated | EXECUTE        |
| get_compiled_ai_system_prompt           | service_role  | EXECUTE        |
| get_current_tenant_id                   | anon          | EXECUTE        |
| get_current_tenant_id                   | authenticated | EXECUTE        |
| get_current_tenant_id                   | service_role  | EXECUTE        |
| get_platform_revenue_analytics          | anon          | EXECUTE        |
| get_platform_revenue_analytics          | authenticated | EXECUTE        |
| get_platform_revenue_analytics          | service_role  | EXECUTE        |
| get_tenant_health_metrics               | anon          | EXECUTE        |
| get_tenant_health_metrics               | authenticated | EXECUTE        |
| get_tenant_health_metrics               | service_role  | EXECUTE        |
| is_branch_manager                       | anon          | EXECUTE        |
| is_branch_manager                       | authenticated | EXECUTE        |
| is_branch_manager                       | service_role  | EXECUTE        |
| is_mfa_authenticated                    | anon          | EXECUTE        |
| is_mfa_authenticated                    | authenticated | EXECUTE        |
| is_mfa_authenticated                    | service_role  | EXECUTE        |
| is_subscription_active                  | anon          | EXECUTE        |
| is_subscription_active                  | authenticated | EXECUTE        |
| is_subscription_active                  | service_role  | EXECUTE        |
| is_sys_admin                            | anon          | EXECUTE        |
| is_sys_admin                            | authenticated | EXECUTE        |
| is_sys_admin                            | service_role  | EXECUTE        |
| log_admin_action                        | anon          | EXECUTE        |
| log_admin_action                        | authenticated | EXECUTE        |
| log_admin_action                        | service_role  | EXECUTE        |
| log_ai_request                          | anon          | EXECUTE        |
| log_ai_request                          | authenticated | EXECUTE        |
| log_ai_request                          | service_role  | EXECUTE        |
| prevent_stock_movement_mutation         | anon          | EXECUTE        |
| prevent_stock_movement_mutation         | authenticated | EXECUTE        |
| prevent_stock_movement_mutation         | service_role  | EXECUTE        |
| publish_due_broadcasts                  | service_role  | EXECUTE        |
| reset_branch_manager_password           | anon          | EXECUTE        |
| reset_branch_manager_password           | authenticated | EXECUTE        |
| reset_branch_manager_password           | service_role  | EXECUTE        |
| resolve_ai_context                      | anon          | EXECUTE        |
| resolve_ai_context                      | authenticated | EXECUTE        |
| resolve_ai_context                      | service_role  | EXECUTE        |
| rls_auto_enable                         | anon          | EXECUTE        |
| rls_auto_enable                         | authenticated | EXECUTE        |
| rls_auto_enable                         | service_role  | EXECUTE        |
| sync_branch_inventory_on_central_update | anon          | EXECUTE        |
| sync_branch_inventory_on_central_update | authenticated | EXECUTE        |
| sync_branch_inventory_on_central_update | service_role  | EXECUTE        |
| tenant_has_feature                      | anon          | EXECUTE        |
| tenant_has_feature                      | authenticated | EXECUTE        |
| tenant_has_feature                      | service_role  | EXECUTE        |
| toggle_sys_feature_flag                 | anon          | EXECUTE        |
| toggle_sys_feature_flag                 | authenticated | EXECUTE        |
| toggle_sys_feature_flag                 | service_role  | EXECUTE        |
| unlock_account                          | anon          | EXECUTE        |
| unlock_account                          | authenticated | EXECUTE        |
| unlock_account                          | service_role  | EXECUTE        |
| unlock_tenant                           | anon          | EXECUTE        |
| unlock_tenant                           | authenticated | EXECUTE        |
| unlock_tenant                           | service_role  | EXECUTE        |
| update_notification_receipt_status      | anon          | EXECUTE        |
| update_notification_receipt_status      | authenticated | EXECUTE        |
| update_notification_receipt_status      | service_role  | EXECUTE        |
| user_has_branch_access                  | anon          | EXECUTE        |
| user_has_branch_access                  | authenticated | EXECUTE        |
| user_has_branch_access                  | service_role  | EXECUTE        |
| verify_step_up_reauth                   | anon          | EXECUTE        |
| verify_step_up_reauth                   | authenticated | EXECUTE        |
| verify_step_up_reauth                   | service_role  | EXECUTE        |
| verify_sys_admin                        | anon          | EXECUTE        |
| verify_sys_admin                        | authenticated | EXECUTE        |
| verify_sys_admin                        | service_role  | EXECUTE        |

**PART 07c**
| trigger_name                              | table_name        | event  | timing | function_called                                            |
| ----------------------------------------- | ----------------- | ------ | ------ | ---------------------------------------------------------- |
| enforce_branch_creation_limits            | branches          | INSERT | BEFORE | EXECUTE FUNCTION check_branch_creation_limits()            |
| enforce_branch_mutation_guard             | branches          | UPDATE | BEFORE | EXECUTE FUNCTION check_branch_mutations()                  |
| enforce_central_inventory_mutations_guard | central_inventory | UPDATE | BEFORE | EXECUTE FUNCTION check_central_inventory_mutations()       |
| enforce_central_inventory_mutations_guard | central_inventory | INSERT | BEFORE | EXECUTE FUNCTION check_central_inventory_mutations()       |
| enforce_central_inventory_mutations_guard | central_inventory | DELETE | BEFORE | EXECUTE FUNCTION check_central_inventory_mutations()       |
| sync_branch_inventory_trigger             | central_inventory | UPDATE | AFTER  | EXECUTE FUNCTION sync_branch_inventory_on_central_update() |
| enforce_inventory_mutations_guard         | inventory         | INSERT | BEFORE | EXECUTE FUNCTION check_inventory_mutations()               |
| enforce_inventory_mutations_guard         | inventory         | DELETE | BEFORE | EXECUTE FUNCTION check_inventory_mutations()               |
| enforce_inventory_mutations_guard         | inventory         | UPDATE | BEFORE | EXECUTE FUNCTION check_inventory_mutations()               |
| enforce_profile_mutations_guard           | profiles          | UPDATE | BEFORE | EXECUTE FUNCTION check_profile_mutations()                 |
| guard_stock_movements_integrity           | stock_movements   | UPDATE | BEFORE | EXECUTE FUNCTION prevent_stock_movement_mutation()         |
| guard_stock_movements_integrity           | stock_movements   | DELETE | BEFORE | EXECUTE FUNCTION prevent_stock_movement_mutation()         |
