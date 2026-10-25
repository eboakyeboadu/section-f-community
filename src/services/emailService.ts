// Client service for triggering transactional Section F emails

import { getAuth } from 'firebase/auth';

/**
 * Builds request headers including the signed-in user's Firebase ID token.
 * The server verifies this token before allowing mail/admin API actions.
 */
async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const user = getAuth().currentUser;
    if (user) {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // Fall through: request will be rejected by the server if auth is required
  }
  return headers;
}

export interface TriggerWelcomeEmailParams {
  displayName: string;
  email: string;
  hbsEmail?: string;
  campusHousing?: string;
  uid?: string;
}

/**
 * Dispatches the official Section F Welcome Email via server proxy
 */
export async function triggerWelcomeEmail(params: TriggerWelcomeEmailParams): Promise<{ success: boolean; messageId?: string }> {
  try {
    const res = await fetch('/api/send-welcome-email', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return { success: !!data.success, messageId: data.messageId };
  } catch (err) {
    console.warn('Could not dispatch welcome email:', err);
    return { success: false };
  }
}

/**
 * Dispatches a test email directly to the admin / user email
 */
export async function triggerTestEmail(toEmail = 'admin@example.com', name = 'Admin'): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/send-test-email', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ to: toEmail, name }),
    });
    const data = await res.json();
    return { success: !!data.success, error: data.error?.message || data.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

/**
 * Dispatches a sample claim invitation email directly to the admin for visual inspection
 */
export async function triggerSampleClaimInvitation(toEmail = 'admin@example.com', name = 'Admin'): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch('/api/send-claim-invitation-sample', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ to: toEmail, name }),
    });
    const data = await res.json();
    return { success: !!data.success, messageId: data.messageId, error: data.error?.message || data.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

export interface BatchClaimRecipient {
  id: string;
  fullName: string;
  hbsEmail: string;
}

/**
 * Dispatches batch claim invitations to eligible cohort members
 */
export async function triggerBatchClaimInvitations(
  recipients: BatchClaimRecipient[],
  excludedEmails: string[] = []
): Promise<{
  success: boolean;
  totalSent?: number;
  totalAttempted?: number;
  results?: Array<{ id: string; name: string; email: string; success: boolean; messageId?: string; error?: string }>;
  error?: string;
}> {
  try {
    const res = await fetch('/api/send-batch-claim-invitations', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ recipients, excludedEmails }),
    });
    const data = await res.json();
    return {
      success: !!data.success,
      totalSent: data.totalSent,
      totalAttempted: data.totalAttempted,
      results: data.results,
      error: data.error?.message || data.error
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

export interface ScheduledCampaignInfo {
  id: string;
  status: 'scheduled' | 'running' | 'completed' | 'cancelled' | 'quota_exceeded' | 'paused';
  scheduledTime: string;
  displayTime: string;
  timeFrameWindow?: string; // "8:00 AM – 10:00 AM ET (2-Hour Buffer Window)"
  pacingIntervalSeconds?: number; // 60s
  currentIndex?: number;
  currentRecipientName?: string;
  nextDispatchAt?: string;
  estimatedCompletionTime?: string;
  recipients: BatchClaimRecipient[];
  excludedEmails: string[];
  totalSent?: number;
  totalAttempted?: number;
  quotaMessage?: string;
  quotaBlockedAt?: string;
  results?: Array<{ id: string; name: string; email: string; success: boolean; messageId?: string; error?: string }>;
}

/**
 * Calculates the next upcoming 8:00 AM ET window dynamically with 2-hour buffer window
 */
export function getNext8amEtSchedule(): { iso: string; display: string; timeFrameWindow: string } {
  const now = new Date();
  const target = new Date();
  // 12:00 UTC = 8:00 AM EDT (UTC-4)
  target.setUTCHours(12, 0, 0, 0);
  if (now.getTime() >= target.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  const dateStr = target.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return {
    iso: target.toISOString(),
    display: `8:00 AM ET (${dateStr})`,
    timeFrameWindow: '8:00 AM – 10:00 AM ET (1 email / min, 2-hour buffer)'
  };
}

/**
 * Fetch current scheduled campaign status & Google SMTP health
 */
export async function fetchScheduledCampaign(): Promise<{
  success: boolean;
  campaign: ScheduledCampaignInfo | null;
  isGmailQuotaBlocked?: boolean;
  gmailQuotaBlockedAt?: string | null;
  serverTime?: string;
}> {
  try {
    const res = await fetch('/api/get-scheduled-invitation', { headers: await authHeaders() });
    const data = await res.json();
    return {
      success: !!data.success,
      campaign: data.campaign,
      isGmailQuotaBlocked: data.isGmailQuotaBlocked,
      gmailQuotaBlockedAt: data.gmailQuotaBlockedAt,
      serverTime: data.serverTime
    };
  } catch (err) {
    console.warn('Could not fetch scheduled campaign:', err);
    return { success: false, campaign: null };
  }
}

/**
 * Manually reset the Gmail quota circuit-breaker flag
 */
export async function resetQuotaStatus(): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch('/api/reset-quota-status', { method: 'POST', headers: await authHeaders() });
    const data = await res.json();
    return { success: !!data.success, message: data.message };
  } catch (err: any) {
    return { success: false, message: err?.message };
  }
}

/**
 * Arm or update the scheduled campaign with pacing configuration
 */
export async function scheduleCohortCampaign(params: {
  scheduledTime: string;
  displayTime?: string;
  timeFrameWindow?: string;
  pacingIntervalSeconds?: number;
  recipients: BatchClaimRecipient[];
  excludedEmails?: string[];
}): Promise<{ success: boolean; campaign?: ScheduledCampaignInfo; error?: string }> {
  try {
    const res = await fetch('/api/schedule-cohort-invitations', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return { success: !!data.success, campaign: data.campaign, error: data.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

/**
 * Cancel the active scheduled campaign
 */
export async function cancelScheduledCohortCampaign(): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/cancel-scheduled-invitations', {
      method: 'POST',
      headers: await authHeaders(),
    });
    const data = await res.json();
    return { success: !!data.success, error: data.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

/**
 * Dispatches an SMS alert to admin via carrier email-to-SMS gateway
 */
export async function triggerAdminSmsAlert(params: {
  phoneNumber: string;
  carrier?: string;
  message?: string;
  alertType?: 'test' | 'login_failed' | 'alert';
  classmateName?: string;
  classmateEmail?: string;
  errorCode?: string;
}): Promise<{ success: boolean; phone?: string; carrier?: string; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/send-admin-sms-alert', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return {
      success: !!data.success,
      phone: data.phone,
      carrier: data.carrier,
      message: data.message,
      error: data.error,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

export interface SendCustomEmailParams {
  to: string;
  recipientName?: string;
  subject: string;
  html?: string;
  text?: string;
}

/**
 * Dispatches a custom email composed in the Administrator Email Studio
 */
export async function triggerSendCustomEmail(params: SendCustomEmailParams): Promise<{
  success: boolean;
  messageId?: string;
  to?: string;
  subject?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/send-custom-email', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return {
      success: !!data.success,
      messageId: data.messageId,
      to: data.to,
      subject: data.subject,
      error: data.error,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

/**
 * Retries failed scheduled cohort invitations without duplicating successful sends
 */
export async function triggerRetryFailedCampaignInvitations(): Promise<{
  success: boolean;
  totalRetried?: number;
  newSuccessCount?: number;
  totalDelivered?: number;
  results?: Array<{ id: string; name: string; email: string; success: boolean; messageId?: string; error?: string }>;
  error?: string;
}> {
  try {
    const res = await fetch('/api/retry-failed-campaign-invitations', {
      method: 'POST',
      headers: await authHeaders(),
    });
    const data = await res.json();
    return {
      success: !!data.success,
      totalRetried: data.totalRetried,
      newSuccessCount: data.newSuccessCount,
      totalDelivered: data.totalDelivered,
      results: data.results,
      error: data.error,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

/**
 * Dispatches an individual claim invitation immediately and removes recipient from scheduled campaign
 */
export async function triggerSendIndividualClaimInvitation(params: {
  classmateId?: string;
  fullName: string;
  hbsEmail: string;
}): Promise<{
  success: boolean;
  messageId?: string;
  excludedFromSchedule?: boolean;
  campaign?: ScheduledCampaignInfo;
  error?: string;
  isQuotaExceeded?: boolean;
}> {
  try {
    const res = await fetch('/api/send-individual-claim-invitation', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return {
      success: !!data.success,
      messageId: data.messageId,
      excludedFromSchedule: data.excludedFromSchedule,
      campaign: data.campaign,
      error: data.error?.message || data.error,
      isQuotaExceeded: !!data.isQuotaExceeded,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}




