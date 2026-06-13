import type { ModuleId } from '../types';

export type WorkspaceRole = 'owner' | 'admin' | 'operator' | 'finance' | 'viewer';

export interface SaasUser {
  id: string;
  email: string;
  name: string;
  avatarLabel?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'business' | 'enterprise';
  createdAt: number;
}

export interface Membership {
  id: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  joinedAt: number;
}

export interface AuthSession {
  user: SaasUser;
  workspace: Workspace;
  membership: Membership;
  issuedAt: number;
  lastActiveAt: number;
}

export interface AuditActor {
  id: string;
  name: string;
  email?: string;
  role: WorkspaceRole;
}

export type AuditAction =
  | 'module_switch'
  | 'split_screen'
  | 'pin_module'
  | 'unpin_module'
  | 'theme_change'
  | 'ai_command'
  | 'workspace_sign_in'
  | 'workspace_sign_out'
  | 'permission_denied'
  | 'settings_change'
  | 'generation_job_start'
  | 'generation_job_complete'
  | 'generation_job_failed'
  | 'generation_job_retry'
  | 'task_create'
  | 'task_status_change'
  | 'task_assign'
  | 'task_complete'
  | 'task_cancel'
  | 'task_delete'
  | 'task_runtime_failure'
  | 'canvas_state_save'
  | 'canvas_workflow_run'
  | 'canvas_snapshot_create'
  | 'asset_create'
  | 'asset_delete'
  | 'asset_export'
  | 'director_shot_parameter_reset'
  | 'director_asset_version_update'
  | 'director_consistency_check'
  | 'director_storyboard_fix_apply'
  | 'director_script_split'
  | 'project_asset_link'
  | 'member_create'
  | 'member_update'
  | 'member_delete'
  | 'member_import'
  | 'role_policy_review'
  | 'billing_plan_update'
  | 'provider_config_create'
  | 'provider_config_update'
  | 'provider_config_default'
  | 'api_key_create'
  | 'api_key_rotate'
  | 'api_key_revoke'
  | 'api_key_export'
  | 'webhook_create'
  | 'webhook_update'
  | 'webhook_delete'
  | 'webhook_secret_rotate'
  | 'webhook_export'
  | 'financial_report_export'
  | 'financial_risk_audit'
  | 'tax_simulation_run'
  | 'tax_deadline_reminder'
  | 'tax_audit_export'
  | 'tax_calculation_run'
  | 'tax_document_parse'
  | 'tax_compliance_doc_generate'
  | 'tax_reconciliation_scan'
  | 'tax_reconciliation_resolve'
  | 'finance_compliance_task_sync'
  | 'data_snapshot_export'
  | 'announcement_publish'
  | 'announcement_update'
  | 'plugin_config_update'
  | 'ticket_update'
  | 'ticket_export'
  | 'agency_partner_update'
  | 'agency_payout_export'
  | 'risk_event_review'
  | 'risk_policy_export'
  | 'media_account_update'
  | 'media_oauth_export'
  | 'payment_method_update'
  | 'billing_recharge_create'
  | 'billing_subscription_change'
  | 'billing_coupon_redeem'
  | 'invoice_export'
  | 'copywriting_keyword_create'
  | 'copywriting_keyword_update'
  | 'copywriting_keyword_archive'
  | 'marketing_lead_create'
  | 'marketing_followup_task_create'
  | 'crm_customer_export'
  | 'crm_followup_task_sync'
  | 'crm_email_draft_generate'
  | 'crm_summary_generate'
  | 'crm_survey_send'
  | 'crm_meeting_summary_generate'
  | 'crm_comment_mention_task_sync'
  | 'crm_roleplay_coach_generate'
  | 'finance_meeting_summary_generate'
  | 'export_workspace'
  | 'general';

export interface AuditLog {
  id: string;
  workspaceId: string;
  actor: AuditActor;
  action: AuditAction;
  moduleId?: ModuleId;
  targetType:
    | 'module'
    | 'workspace'
    | 'asset'
    | 'task'
    | 'customer'
    | 'generation_job'
    | 'api_key'
    | 'webhook'
    | 'billing_plan'
    | 'provider_config'
    | 'announcement'
    | 'plugin_config'
    | 'ticket'
    | 'agency_partner'
    | 'risk_event'
    | 'media_account'
    | 'payment_method'
    | 'invoice'
    | 'settings'
    | 'runtime'
    | 'system';
  targetId?: string;
  metadata: Record<string, unknown>;
  timestamp: number;
}
