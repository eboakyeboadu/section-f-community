import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import nodemailer from 'nodemailer';
import type { SendMailOptions } from 'nodemailer';
import { generateWelcomeEmailHtml, generateClaimInvitationEmailHtml } from './src/services/emailTemplate.ts';
import { SECTION_F_ROSTER } from './src/data/sectionFRoster.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    return parseInt(process.argv[portArgIndex + 1], 10);
  }
  if (process.env.NODE_ENV === 'production' && process.env.PORT) {
    return parseInt(process.env.PORT, 10);
  }
  return 3000;
}

const app = express();
const PORT = getPort();

// Official Gmail SMTP configuration with App Password (100% Google SMTP)
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

// Circuit breaker state for Gmail daily quota (550-5.4.5)
let isGmailQuotaBlocked = true; // Flagged true when Gmail 550-5.4.5 limit is encountered today
let gmailQuotaBlockedAt: string | null = new Date().toISOString();

export function isQuotaExceededError(err: any): boolean {
  const msg = (err?.message || String(err || '')).toLowerCase();
  return (
    msg.includes('550-5.4.5') ||
    msg.includes('550 5.4.5') ||
    msg.includes('daily user sending limit exceeded') ||
    msg.includes('sending limit exceeded') ||
    msg.includes('quota exceeded')
  );
}

const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  pool: true, // Reuses authenticated SMTP connection pool across staggered dispatches
  maxConnections: 1, // 1 socket prevents concurrent auth collisions with Gmail
  maxMessages: 100, // Up to 100 messages per authenticated session
  rateDelta: 1000,
  rateLimit: 1,
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

if (GMAIL_USER && GMAIL_APP_PASSWORD) {
  mailTransporter.verify((error) => {
    if (error) {
      console.warn('[Google SMTP] Connection pool warning:', error.message);
    } else {
      console.log('[Google SMTP] Connection pool verified.');
    }
  });
} else {
  console.log('[Mail] No GMAIL_USER / GMAIL_APP_PASSWORD set: email sending is disabled in this demo.');
}

// STRICT DOMAIN GUARD: Intercept and scrub any accidental Cloud Run or staging URLs from outgoing communications
export function scrubOutboundCloudRunUrls(content: any): any {
  if (typeof content === 'string') {
    return content.replace(/https?:\/\/[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]*run\.app[^\s"'<>)]*/gi, (_match) => {
      console.warn(`[DOMAIN GUARD] 🛡️ Intercepted Cloud Run URL. Replaced with official domain "https://sectionf28.ai.studio".`);
      return 'https://sectionf28.ai.studio';
    });
  }
  return content;
}

// Resilient Google SMTP delivery helper with automatic backoff for transient 454 rate-limits,
// and immediate circuit breaker for 550 daily quota exhaustion
async function sendEmailWithRetry(
  mailOptions: SendMailOptions, 
  maxRetries = 1
): Promise<{ success: boolean; messageId?: string; error?: string; isQuotaExceeded?: boolean; provider: 'gmail' }> {
  const sanitizedOptions: SendMailOptions = {
    ...mailOptions,
    subject: typeof mailOptions.subject === 'string' ? scrubOutboundCloudRunUrls(mailOptions.subject) : mailOptions.subject,
    html: typeof mailOptions.html === 'string' ? scrubOutboundCloudRunUrls(mailOptions.html) : mailOptions.html,
    text: typeof mailOptions.text === 'string' ? scrubOutboundCloudRunUrls(mailOptions.text) : mailOptions.text,
  };

  // If Gmail quota is currently blocked, cleanly reject without hammering Google's servers
  if (isGmailQuotaBlocked) {
    return { 
      success: false, 
      isQuotaExceeded: true, 
      provider: 'gmail',
      error: 'Gmail daily user sending limit exceeded (550-5.4.5). Deliveries are paused to protect account reputation. Rolling reset occurs in 24 hours.' 
    };
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const info = await mailTransporter.sendMail(sanitizedOptions);
      return { success: true, messageId: info.messageId, provider: 'gmail' };
    } catch (err: any) {
      if (isQuotaExceededError(err)) {
        console.warn(`[Google SMTP] ⚠️ Gmail daily sending limit exceeded (550-5.4.5). Tripping circuit breaker.`);
        isGmailQuotaBlocked = true;
        gmailQuotaBlockedAt = new Date().toISOString();

        return { 
          success: false, 
          isQuotaExceeded: true, 
          provider: 'gmail',
          error: 'Gmail daily user sending limit exceeded (550-5.4.5). Google enforces a daily ceiling for SMTP.' 
        };
      }

      const isRateLimit = err?.message?.includes('454') || err?.message?.includes('Too many login attempts') || err?.message?.includes('421');
      if (isRateLimit && attempt < maxRetries) {
        console.warn(`[Google SMTP] Transient rate-limit encountered (${err?.message}). Pausing 8 seconds before retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 8000));
        continue;
      }
      return { success: false, provider: 'gmail', error: err?.message || 'Send error' };
    }
  }
  return { success: false, provider: 'gmail', error: 'Max retries exceeded' };
}

app.use(express.json());

// --- API authentication ---------------------------------------------------------
// Mail/admin endpoints require a verified Firebase ID token:
//   Authorization: Bearer <token>
// Verification uses Google's Identity Toolkit REST API (accounts:lookup), so no
// service-account credential is needed. Admin endpoints additionally require the
// verified email to be listed in ADMIN_EMAILS.
const FIREBASE_WEB_API_KEY = (() => {
  if (process.env.FIREBASE_API_KEY) return process.env.FIREBASE_API_KEY;
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf-8'));
    return cfg.apiKey || '';
  } catch {
    return '';
  }
})();

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@example.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

interface VerifiedUser {
  uid: string;
  email: string;
  email_verified: boolean;
}

async function verifyIdToken(token: string): Promise<VerifiedUser | null> {
  if (!FIREBASE_WEB_API_KEY) return null;
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      }
    );
    if (!resp.ok) return null;
    const data: any = await resp.json();
    const u = data?.users?.[0];
    if (!u?.localId) return null;
    return { uid: u.localId, email: (u.email || '').toLowerCase(), email_verified: u.emailVerified === true };
  } catch {
    return null;
  }
}

async function requireSignedIn(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const user = token ? await verifyIdToken(token) : null;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Sign-in required for this action' });
  }
  (req as any).verifiedUser = user;
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).verifiedUser as VerifiedUser | undefined;
  if (!user || !user.email_verified || !ADMIN_EMAILS.includes(user.email)) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}
// --- End API authentication -----------------------------------------------------

// Preview route: Directly inspect the rendered welcome email in any browser
app.get('/welcome-email-preview', (_req, res) => {
  const html = generateWelcomeEmailHtml({
    displayName: 'Jordan Sample',
    email: 'jordan.sample@example.com',
    hbsEmail: 'jordan.sample@example.com',
    campusHousing: 'Demo Residence Hall',
    appUrl: process.env.APP_URL || 'https://sectionf28.ai.studio'
  });
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Preview route: Directly inspect the rendered claim invitation in browser
app.get('/claim-invitation-preview', (_req, res) => {
  const html = generateClaimInvitationEmailHtml({
    displayName: 'Riley Demo',
    email: 'riley.demo@example.com',
    hbsEmail: 'riley.demo@example.com',
    appUrl: 'https://sectionf28.ai.studio'
  });
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Click-tracking redirect route for outbound emails
app.get('/api/track/email-click', (req, res) => {
  const campaign = req.query.c || 'claim_invitation';
  const userId = req.query.u || 'anonymous';
  const destination = (req.query.to as string) || '/';

  console.log(`[Analytics] 📧 Email link clicked! Campaign: ${campaign}, User: ${userId}`);

  // Construct target URL with attribution parameter for client-side analytics
  const targetUrl = `https://sectionf28.ai.studio${destination.startsWith('/') ? destination : '/' + destination}?src=email_click&c=${encodeURIComponent(String(campaign))}`;

  return res.redirect(302, targetUrl);
});

// Endpoint: Send test welcome email to admin / tester via Gmail
app.post('/api/send-test-email', requireSignedIn, requireAdmin, async (req, res) => {
  try {
    const targetEmail = req.body?.to || 'admin@example.com';
    const recipientName = req.body?.name || 'Laurie';

    const html = generateWelcomeEmailHtml({
      displayName: recipientName,
      email: targetEmail,
      hbsEmail: 'admin@example.com',
      campusHousing: 'Soldiers Field Park',
      appUrl: 'https://sectionf28.ai.studio'
    });

    const info = await mailTransporter.sendMail({
      from: `"Section F Community Hub" <${GMAIL_USER}>`,
      replyTo: GMAIL_USER,
      to: targetEmail,
      subject: `🎓 Welcome to Section F Community Hub, ${recipientName}! Your Directory Profile is Ready`,
      html,
    });

    console.log('Gmail test email sent:', info.messageId);
    return res.json({ success: true, messageId: info.messageId, to: targetEmail });
  } catch (err: any) {
    console.error('Failed to send test email via Gmail:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// Endpoint: Send SMS alert to admin via carrier email-to-SMS gateway + admin mirror
app.post('/api/send-admin-sms-alert', requireSignedIn, requireAdmin, async (req, res) => {
  try {
    const { 
      phoneNumber, 
      carrier = 'auto', 
      message, 
      alertType = 'alert', 
      classmateName, 
      classmateEmail, 
      errorCode 
    } = req.body || {};

    // Normalize phone number (digits only)
    const digits = (phoneNumber || '').replace(/\D/g, '');
    const cleanPhone = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;

    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide a valid 10-digit US phone number (e.g. 617-555-0199).' 
      });
    }

    // Carrier gateway mappings - Broadcasts to all top US carriers
    const targetAddresses: string[] = [
      `${cleanPhone}@vtext.com`,       // Verizon
      `${cleanPhone}@txt.att.net`,     // AT&T
      `${cleanPhone}@tmomail.net`,     // T-Mobile
      `${cleanPhone}@email.uscc.net`,  // US Cellular
    ];

    // Current micro-timestamp nonce to bypass carrier deduplication/spam filters
    const timeNonce = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    // Compose concise SMS text (< 155 chars to prevent SMS truncation)
    let smsBody = message;
    if (!smsBody) {
      if (alertType === 'test') {
        smsBody = `Section F: Test SMS alert received! Mobile notifications active for ${cleanPhone} [${timeNonce}].`;
      } else if (alertType === 'login_failed') {
        smsBody = `Section F Alert: Login issue with ${classmateName || classmateEmail || 'classmate'} (${errorCode || 'auth error'}) [${timeNonce}]. Hub: sectionf28.ai.studio`;
      } else {
        smsBody = `Section F: System incident detected [${timeNonce}]. Hub: sectionf28.ai.studio`;
      }
    } else {
      smsBody = `${smsBody} [${timeNonce}]`;
    }
    smsBody = scrubOutboundCloudRunUrls(smsBody).slice(0, 155);

    // 1. Dispatch via carrier email-to-SMS gateway with valid subject 'Section F' to pass carrier spam checks
    const dispatchPromises = targetAddresses.map((addr) =>
      mailTransporter.sendMail({
        from: `"Section F" <${GMAIL_USER}>`,
        to: addr,
        subject: 'Section F', // Valid subject prevents AT&T and T-Mobile from dropping empty-subject emails
        text: smsBody,
      })
    );

    // 2. Also send mirror notification email to the admin email
    dispatchPromises.push(
      mailTransporter.sendMail({
        from: `"Section F Alert Engine" <${GMAIL_USER}>`,
        to: 'admin@example.com',
        subject: `📱 [SMS Alert] ${alertType.toUpperCase()}: ${classmateName || cleanPhone}`,
        text: `SMS Alert dispatched to ${cleanPhone}:\n\n"${smsBody}"\n\nClassmate: ${classmateName || 'N/A'}\nEmail: ${classmateEmail || 'N/A'}\nError: ${errorCode || 'N/A'}\nTimestamp: ${new Date().toISOString()}`,
      })
    );

    await Promise.allSettled(dispatchPromises);

    console.log(`[SMS Alert] Dispatched to ${cleanPhone} via ${targetAddresses.join(', ')}: "${smsBody}"`);
    return res.json({
      success: true,
      phone: cleanPhone,
      carrier: 'auto-dispatch',
      gateways: targetAddresses,
      message: smsBody,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Failed to send SMS alert:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// Endpoint: Send sample claim invitation email to admin for visual inspection
app.post('/api/send-claim-invitation-sample', requireSignedIn, requireAdmin, async (req, res) => {
  try {
    const targetEmail = req.body?.to || 'admin@example.com';
    const recipientName = req.body?.name || 'Laurie';

    const html = generateClaimInvitationEmailHtml({
      displayName: recipientName,
      email: targetEmail,
      hbsEmail: 'admin@example.com',
      appUrl: 'https://sectionf28.ai.studio'
    });

    const sendRes = await sendEmailWithRetry({
      from: `"Section F Community Hub" <${GMAIL_USER}>`,
      replyTo: GMAIL_USER,
      to: targetEmail,
      subject: `👋 Section F Directory: Claim your classmate profile (takes 30 seconds!)`,
      html,
    });

    if (sendRes.success) {
      console.log(`[Sample Email] Dispatched to ${targetEmail} via ${sendRes.provider || 'gmail'}: ${sendRes.messageId}`);
      return res.json({ success: true, messageId: sendRes.messageId, to: targetEmail, provider: sendRes.provider });
    }

    return res.status(sendRes.isQuotaExceeded ? 429 : 500).json({ 
      success: false, 
      error: sendRes.error || 'Failed to dispatch sample claim email',
      isQuotaExceeded: !!sendRes.isQuotaExceeded
    });
  } catch (err: any) {
    console.error('Failed to send sample claim invitation:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// Endpoint: Send welcome email when a user claims their profile
app.post('/api/send-welcome-email', requireSignedIn, async (req, res) => {
  try {
    const { displayName, email, hbsEmail, campusHousing } = req.body || {};

    if (!email) {
      return res.status(400).json({ success: false, error: 'Recipient email is required' });
    }

    // Callers may only trigger a welcome email to themselves, unless they are an admin
    const requester = (req as any).verifiedUser as { uid: string; email: string } | undefined;
    const isSelf = requester && String(email).trim().toLowerCase() === requester.email;
    if (!isSelf && !(requester && ADMIN_EMAILS.includes(requester.email))) {
      return res.status(403).json({ success: false, error: 'You can only send a welcome email to yourself' });
    }

    const html = generateWelcomeEmailHtml({
      displayName: displayName || 'Classmate',
      email,
      hbsEmail: hbsEmail || email,
      campusHousing: campusHousing || 'Soldiers Field Park',
      appUrl: process.env.APP_URL || 'https://sectionf28.ai.studio'
    });

    const sendRes = await sendEmailWithRetry({
      from: `"Section F Community Hub" <${GMAIL_USER}>`,
      replyTo: GMAIL_USER,
      to: email,
      subject: `🎓 Welcome to Section F Community Hub, ${displayName || 'Classmate'}! Your Directory Profile is Ready`,
      html,
    });

    if (sendRes.success) {
      console.log(`[Welcome Email] Dispatched to ${email} via ${sendRes.provider || 'gmail'}: ${sendRes.messageId}`);
      return res.json({ success: true, messageId: sendRes.messageId, provider: sendRes.provider });
    }

    return res.status(sendRes.isQuotaExceeded ? 429 : 500).json({
      success: false,
      error: sendRes.error || 'Failed to dispatch welcome email',
      isQuotaExceeded: !!sendRes.isQuotaExceeded
    });
  } catch (err: any) {
    console.error('Failed to send welcome email:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// Endpoint: Send an individual claim invitation immediately & exclude from scheduled campaign
app.post('/api/send-individual-claim-invitation', requireSignedIn, requireAdmin, async (req, res) => {
  try {
    const { classmateId, fullName, hbsEmail } = req.body || {};

    if (!hbsEmail || typeof hbsEmail !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid HBS email is required.' });
    }

    const cleanEmail = hbsEmail.trim().toLowerCase();
    const cleanName = fullName?.trim() || 'Classmate';

    const html = generateClaimInvitationEmailHtml({
      displayName: cleanName,
      email: cleanEmail,
      hbsEmail: cleanEmail,
      appUrl: 'https://sectionf28.ai.studio'
    });

    const sendRes = await sendEmailWithRetry({
      from: `"Section F Community Hub" <${GMAIL_USER}>`,
      replyTo: GMAIL_USER,
      to: cleanEmail,
      subject: `👋 Section F Directory: Claim your classmate profile (takes 30 seconds!)`,
      html,
    });

    if (sendRes.success) {
      console.log(`[Individual Invite] ✓ Dispatched claim invitation to ${cleanName} (${cleanEmail}): ${sendRes.messageId}`);

      // Exclude from scheduled campaign if active
      if (activeScheduledCampaign) {
        if (!activeScheduledCampaign.excludedEmails.some((e) => e.toLowerCase() === cleanEmail)) {
          activeScheduledCampaign.excludedEmails.push(cleanEmail);
        }

        // Filter out from active recipients list if pre-populated
        if (activeScheduledCampaign.recipients && activeScheduledCampaign.recipients.length > 0) {
          activeScheduledCampaign.recipients = activeScheduledCampaign.recipients.filter(
            (r) => r.hbsEmail.toLowerCase() !== cleanEmail
          );
        }

        // Track in campaign results
        if (!activeScheduledCampaign.results) {
          activeScheduledCampaign.results = [];
        }
        const existingIdx = activeScheduledCampaign.results.findIndex(
          (r) => r.email.toLowerCase() === cleanEmail
        );
        const resultItem = {
          id: classmateId || `manual_${Date.now()}`,
          name: cleanName,
          email: cleanEmail,
          success: true,
          messageId: sendRes.messageId
        };
        if (existingIdx >= 0) {
          activeScheduledCampaign.results[existingIdx] = resultItem;
        } else {
          activeScheduledCampaign.results.push(resultItem);
        }

        activeScheduledCampaign.totalSent = activeScheduledCampaign.results.filter((r) => r.success).length;
        console.log(`[Individual Invite] 🛡️ Added ${cleanEmail} to scheduled campaign exclusions. Guaranteed 0 duplicate sends tomorrow.`);
      }

      return res.json({
        success: true,
        messageId: sendRes.messageId,
        excludedFromSchedule: true,
        campaign: activeScheduledCampaign
      });
    }

    return res.status(sendRes.isQuotaExceeded ? 429 : 500).json({
      success: false,
      error: sendRes.error || 'Failed to dispatch individual claim invitation',
      isQuotaExceeded: !!sendRes.isQuotaExceeded
    });
  } catch (err: any) {
    console.error('Error dispatching individual claim invitation:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// Endpoint: Send batch claim invitations to unclaimed cohort members
app.post('/api/send-batch-claim-invitations', requireSignedIn, requireAdmin, async (req, res) => {
  try {
    const { recipients = [], excludedEmails = [] } = req.body || {};

    // Build set of excluded emails (lowercased) + temporary Court exclusion
    const excludedSet = new Set(
      (excludedEmails as string[]).map((e) => e.toLowerCase()).concat([
        'excluded@example.com',
        'excluded@example.com'
      ])
    );

    const eligible = (recipients as Array<{ id: string; fullName: string; hbsEmail: string }>).filter((r) => {
      if (!r.hbsEmail) return false;
      const lower = r.hbsEmail.toLowerCase();
      if (excludedSet.has(lower)) return false;
      if (r.fullName?.toLowerCase().includes('court adams')) return false;
      return true;
    });

    console.log(`Starting batch claim invitation dispatch for ${eligible.length} recipients...`);
    const results: Array<{ id: string; name: string; email: string; success: boolean; messageId?: string; error?: string }> = [];

    for (let i = 0; i < eligible.length; i++) {
      const recipient = eligible[i];
      const html = generateClaimInvitationEmailHtml({
        displayName: recipient.fullName || 'Classmate',
        email: recipient.hbsEmail,
        hbsEmail: recipient.hbsEmail,
        appUrl: 'https://sectionf28.ai.studio'
      });

      const sendRes = await sendEmailWithRetry({
        from: `"Section F Community Hub" <${GMAIL_USER}>`,
        replyTo: GMAIL_USER,
        to: recipient.hbsEmail,
        subject: `👋 Section F Directory: Claim your classmate profile (takes 30 seconds!)`,
        html,
      });

      if (sendRes.success) {
        results.push({
          id: recipient.id,
          name: recipient.fullName,
          email: recipient.hbsEmail,
          success: true,
          messageId: sendRes.messageId
        });
        console.log(`✓ Invitation dispatched to ${recipient.fullName} (${recipient.hbsEmail}): ${sendRes.messageId}`);
      } else {
        console.warn(`✗ Error dispatching to ${recipient.hbsEmail}:`, sendRes.error);
        results.push({
          id: recipient.id,
          name: recipient.fullName,
          email: recipient.hbsEmail,
          success: false,
          error: sendRes.error || 'Send error'
        });

        // CIRCUIT BREAKER: If 550 daily sending limit is reached, stop immediately
        if (sendRes.isQuotaExceeded || (sendRes.error && isQuotaExceededError({ message: sendRes.error }))) {
          console.warn(`[Batch] ⚠️ Circuit breaker activated: Gmail daily quota reached. Pausing remaining ${eligible.length - (i + 1)} recipients.`);
          for (let rem = i + 1; rem < eligible.length; rem++) {
            results.push({
              id: eligible[rem].id,
              name: eligible[rem].fullName,
              email: eligible[rem].hbsEmail,
              success: false,
              error: 'Paused: Gmail daily sending limit reached (550-5.4.5). Resets in 24 hours.'
            });
          }
          break;
        }
      }

      // 1500ms rate-limit pause between dispatches to maintain SMTP health
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    const totalSuccess = results.filter((r) => r.success).length;
    return res.json({
      success: true,
      totalSent: totalSuccess,
      totalAttempted: eligible.length,
      isQuotaExceeded: isGmailQuotaBlocked,
      results
    });
  } catch (err: any) {
    console.error('Batch invitation error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// -------------------------------------------------------------
// Scheduled Cohort Email Campaign Engine (8:00 AM – 10:00 AM ET, 2-Hour Buffer)
// Pacing: Exactly 1 email every 60 seconds (1 minute) to ensure optimal Gmail deliverability
// -------------------------------------------------------------
interface ScheduledCampaign {
  id: string;
  status: 'scheduled' | 'running' | 'completed' | 'cancelled' | 'quota_exceeded' | 'paused';
  scheduledTime: string; // ISO format
  displayTime: string;
  timeFrameWindow: string; // "8:00 AM – 10:00 AM ET (2-Hour Buffer Window)"
  pacingIntervalSeconds: number; // 60 seconds
  currentIndex?: number;
  currentRecipientName?: string;
  nextDispatchAt?: string;
  estimatedCompletionTime?: string;
  recipients: Array<{ id: string; fullName: string; hbsEmail: string }>;
  excludedEmails: string[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  totalSent?: number;
  totalAttempted?: number;
  quotaMessage?: string;
  quotaBlockedAt?: string;
  results?: Array<{ id: string; name: string; email: string; success: boolean; messageId?: string; error?: string }>;
}

// Pre-scheduled for tomorrow at 8:00 AM ET (12:00 UTC) with 2-hour buffer window (8:00 AM – 10:00 AM ET)
let activeScheduledCampaign: ScheduledCampaign | null = {
  id: 'onboarding_campaign_8am_oct24',
  status: 'scheduled',
  scheduledTime: '2026-10-24T12:00:00.000Z', // Tomorrow 8:00 AM ET
  displayTime: '8:00 AM ET (Oct 24, 2026) · Staggered 2-Hour Window',
  timeFrameWindow: '8:00 AM – 10:00 AM ET (1 email / min, 120-min buffer)',
  pacingIntervalSeconds: 60,
  recipients: [], // defaults to all unclaimed Section F classmates
  excludedEmails: [
    'excluded@example.com',
    'excluded@example.com',
    'excluded@example.com',
    'excluded@example.com',
    'excluded@example.com',
    'excluded@example.com',
    'excluded@example.com'
  ],
  createdAt: new Date().toISOString()
};

async function executeScheduledCampaign() {
  if (!activeScheduledCampaign || activeScheduledCampaign.status !== 'scheduled') {
    return;
  }

  const now = new Date();
  const targetDate = new Date(activeScheduledCampaign.scheduledTime);

  // Check if target execution time has arrived
  if (now.getTime() < targetDate.getTime()) {
    return;
  }

  // When scheduled date arrives, clear previous day's quota block flag so Google's fresh quota can be utilized
  isGmailQuotaBlocked = false;
  gmailQuotaBlockedAt = null;

  activeScheduledCampaign.status = 'running';
  activeScheduledCampaign.startedAt = new Date().toISOString();
  console.log(`[Scheduler] ⏰ Reached 8:00 AM ET! Starting 2-Hour Staggered Drip Engine (1 email/minute) for "${activeScheduledCampaign.id}"...`);

  try {
    const defaultRosterRecipients = SECTION_F_ROSTER.map((m, idx) => ({
      id: `card_${idx}`,
      fullName: m.displayName,
      hbsEmail: m.hbsEmail
    }));

    const rawList = activeScheduledCampaign.recipients.length > 0
      ? activeScheduledCampaign.recipients
      : defaultRosterRecipients;

    const excludedSet = new Set(
      activeScheduledCampaign.excludedEmails.map((e) => e.toLowerCase()).concat([
        'excluded@example.com',
        'excluded@example.com',
        'excluded@example.com',
        'excluded@example.com',
        'excluded@example.com',
        'excluded@example.com',
        'excluded@example.com'
      ])
    );

    const eligible = rawList.filter((r) => {
      if (!r.hbsEmail) return false;
      if (excludedSet.has(r.hbsEmail.toLowerCase())) return false;
      if (r.fullName?.toLowerCase().includes('court adams')) return false;
      return true;
    });

    const pacingSeconds = activeScheduledCampaign.pacingIntervalSeconds || 60;
    const estDurationMinutes = Math.ceil((eligible.length * pacingSeconds) / 60);
    const estCompletion = new Date(now.getTime() + eligible.length * pacingSeconds * 1000);
    activeScheduledCampaign.estimatedCompletionTime = estCompletion.toISOString();
    activeScheduledCampaign.totalAttempted = eligible.length;

    console.log(`[Scheduler Drip] 🚀 Dispatching to ${eligible.length} classmates spaced 1 email every ${pacingSeconds}s. Estimated duration: ~${estDurationMinutes} mins (finishes ~${estCompletion.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ET).`);
    const results: Array<{ id: string; name: string; email: string; success: boolean; messageId?: string; error?: string }> = [];

    for (let i = 0; i < eligible.length; i++) {
      // Abort if campaign was cancelled mid-flight by admin
      if ((activeScheduledCampaign.status as string) === 'cancelled') {
        console.log('[Scheduler Drip] 🛑 Campaign was cancelled by administrator mid-execution.');
        return;
      }

      const recipient = eligible[i];
      activeScheduledCampaign.currentIndex = i + 1;
      activeScheduledCampaign.currentRecipientName = recipient.fullName;

      const html = generateClaimInvitationEmailHtml({
        displayName: recipient.fullName || 'Classmate',
        email: recipient.hbsEmail,
        hbsEmail: recipient.hbsEmail,
        appUrl: 'https://sectionf28.ai.studio'
      });

      const sendRes = await sendEmailWithRetry({
        from: `"Section F Community Hub" <${GMAIL_USER}>`,
        replyTo: GMAIL_USER,
        to: recipient.hbsEmail,
        subject: `👋 Section F Directory: Claim your classmate profile (takes 30 seconds!)`,
        html,
      });

      if (sendRes.success) {
        results.push({
          id: recipient.id,
          name: recipient.fullName,
          email: recipient.hbsEmail,
          success: true,
          messageId: sendRes.messageId
        });
        console.log(`[Scheduler Drip] [${i + 1}/${eligible.length}] ✓ Dispatched to ${recipient.fullName} (${recipient.hbsEmail}): ${sendRes.messageId}`);
      } else {
        console.warn(`[Scheduler Drip] [${i + 1}/${eligible.length}] ✗ Failed for ${recipient.hbsEmail}:`, sendRes.error);
        results.push({
          id: recipient.id,
          name: recipient.fullName,
          email: recipient.hbsEmail,
          success: false,
          error: sendRes.error || 'Send error'
        });

        // CIRCUIT BREAKER: If 550 daily sending limit is reached, stop immediately
        if (sendRes.isQuotaExceeded || (sendRes.error && isQuotaExceededError({ message: sendRes.error }))) {
          console.warn(`[Scheduler Drip] ⚠️ Circuit breaker activated: Gmail daily quota limit encountered. Halting remaining ${eligible.length - (i + 1)} recipients.`);
          for (let rem = i + 1; rem < eligible.length; rem++) {
            results.push({
              id: eligible[rem].id,
              name: eligible[rem].fullName,
              email: eligible[rem].hbsEmail,
              success: false,
              error: 'Paused: Gmail daily sending limit reached (550-5.4.5). Resets in 24 hours.'
            });
          }
          activeScheduledCampaign.status = 'quota_exceeded';
          activeScheduledCampaign.quotaMessage = 'Gmail daily user sending limit exceeded (550-5.4.5). Deliveries paused to protect account reputation.';
          activeScheduledCampaign.quotaBlockedAt = new Date().toISOString();
          activeScheduledCampaign.completedAt = new Date().toISOString();
          activeScheduledCampaign.results = results;
          activeScheduledCampaign.totalSent = results.filter((r) => r.success).length;
          activeScheduledCampaign.totalAttempted = eligible.length;
          return;
        }
      }

      activeScheduledCampaign.totalSent = results.filter((r) => r.success).length;
      activeScheduledCampaign.results = results;

      // 60-second (1 minute) spacing pause between emails to preserve Gmail SMTP reputation
      if (i < eligible.length - 1) {
        activeScheduledCampaign.nextDispatchAt = new Date(Date.now() + pacingSeconds * 1000).toISOString();
        await new Promise((resolve) => setTimeout(resolve, pacingSeconds * 1000));
      }
    }

    activeScheduledCampaign.status = 'completed';
    activeScheduledCampaign.completedAt = new Date().toISOString();
    activeScheduledCampaign.results = results;
    activeScheduledCampaign.totalSent = results.filter((r) => r.success).length;
    activeScheduledCampaign.totalAttempted = eligible.length;
    console.log(`[Scheduler Drip] ✅ Successfully completed 2-hour staggered campaign! Dispatched ${activeScheduledCampaign.totalSent} of ${eligible.length} emails.`);
  } catch (error: any) {
    console.error('[Scheduler Drip] Fatal error during scheduled campaign execution:', error);
    activeScheduledCampaign.status = 'cancelled';
  }
}

// Polling interval checking every 20 seconds for scheduled jobs
setInterval(executeScheduledCampaign, 20000);

// Endpoint: Retry failed/throttled campaign invitations without re-sending to succeeded recipients
app.post('/api/retry-failed-campaign-invitations', requireSignedIn, requireAdmin, async (_req, res) => {
  try {
    if (!activeScheduledCampaign || !activeScheduledCampaign.results) {
      return res.status(400).json({ success: false, error: 'No active campaign results to retry.' });
    }

    // Check if Gmail quota is currently blocked
    if (isGmailQuotaBlocked) {
      return res.status(429).json({
        success: false,
        error: 'Gmail daily user sending limit (550-5.4.5) is active. Google resets sending quotas every 24 hours. Retry is paused to protect account security.',
        isQuotaExceeded: true,
        quotaBlockedAt: gmailQuotaBlockedAt
      });
    }

    const failedRecipients = activeScheduledCampaign.results.filter((r) => !r.success);
    if (failedRecipients.length === 0) {
      return res.json({ 
        success: true, 
        message: 'All eligible classmates have already received their invitation!', 
        retriedCount: 0 
      });
    }

    console.log(`[Scheduler] 🔄 Retrying ${failedRecipients.length} previously un-delivered invitations (paced 1 email/min)...`);
    const retryResults: Array<{ id: string; name: string; email: string; success: boolean; messageId?: string; error?: string }> = [];

    for (let i = 0; i < failedRecipients.length; i++) {
      const recipient = failedRecipients[i];
      const html = generateClaimInvitationEmailHtml({
        displayName: recipient.name || 'Classmate',
        email: recipient.email,
        hbsEmail: recipient.email,
        appUrl: 'https://sectionf28.ai.studio'
      });

      const sendRes = await sendEmailWithRetry({
        from: `"Section F Community Hub" <${GMAIL_USER}>`,
        replyTo: GMAIL_USER,
        to: recipient.email,
        subject: `👋 Section F Directory: Claim your classmate profile (takes 30 seconds!)`,
        html,
      });

      retryResults.push({
        id: recipient.id,
        name: recipient.name,
        email: recipient.email,
        success: sendRes.success,
        messageId: sendRes.messageId,
        error: sendRes.error
      });

      // Update in-memory campaign result entry
      const origIdx = activeScheduledCampaign.results.findIndex(
        (r) => r.email.toLowerCase() === recipient.email.toLowerCase()
      );
      if (origIdx !== -1) {
        activeScheduledCampaign.results[origIdx] = {
          ...activeScheduledCampaign.results[origIdx],
          success: sendRes.success,
          messageId: sendRes.messageId,
          error: sendRes.error
        };
      }

      // CIRCUIT BREAKER: Break immediately on quota exhaustion
      if (sendRes.isQuotaExceeded || (sendRes.error && isQuotaExceededError({ message: sendRes.error }))) {
        console.warn(`[Scheduler] ⚠️ Quota hit during retry. Halting loop.`);
        break;
      }

      // 60-second pacing between retry emails
      if (i < failedRecipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 60000));
      }
    }

    activeScheduledCampaign.totalSent = activeScheduledCampaign.results.filter((r) => r.success).length;

    return res.json({
      success: true,
      totalRetried: retryResults.length,
      newSuccessCount: retryResults.filter((r) => r.success).length,
      totalDelivered: activeScheduledCampaign.totalSent,
      results: retryResults
    });
  } catch (err: any) {
    console.error('Error retrying campaign invitations:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// Endpoint: Send custom email from Email Studio / Composer
app.post('/api/send-custom-email', requireSignedIn, requireAdmin, async (req, res) => {
  try {
    const { to, recipientName, subject, html, text } = req.body || {};

    if (!to) {
      return res.status(400).json({ success: false, error: 'Recipient email is required.' });
    }

    if (!subject) {
      return res.status(400).json({ success: false, error: 'Email subject is required.' });
    }

    const sendRes = await sendEmailWithRetry({
      from: `"Section F" <${GMAIL_USER}>`,
      replyTo: GMAIL_USER,
      to,
      subject,
      html: html || `<p>${text || subject}</p>`,
      text: text || '',
    });

    if (sendRes.success) {
      console.log(`[Email Studio] Custom email dispatched to ${to} (${recipientName || 'Recipient'}): ${sendRes.messageId} via Google SMTP`);
      return res.json({
        success: true,
        messageId: sendRes.messageId,
        provider: 'gmail',
        to,
        subject,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(sendRes.isQuotaExceeded ? 429 : 500).json({ 
        success: false, 
        error: sendRes.error || 'Failed to dispatch email',
        isQuotaExceeded: !!sendRes.isQuotaExceeded
      });
    }
  } catch (err: any) {
    console.error('[Email Studio] Failed to send custom email:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to dispatch email' });
  }
});

// Endpoint: Get current scheduled campaign status & countdown
app.get('/api/get-scheduled-invitation', requireSignedIn, requireAdmin, (_req, res) => {
  res.json({
    success: true,
    campaign: activeScheduledCampaign,
    isGmailQuotaBlocked,
    gmailQuotaBlockedAt,
    serverTime: new Date().toISOString()
  });
});

// Endpoint: Reset Gmail quota block (for admin manual reset or testing after 24h window)
app.post('/api/reset-quota-status', requireSignedIn, requireAdmin, (_req, res) => {
  isGmailQuotaBlocked = false;
  gmailQuotaBlockedAt = null;
  console.log('[Email Engine] 🔄 Admin manually reset Gmail quota block flag.');
  res.json({ success: true, isGmailQuotaBlocked: false, message: 'Gmail quota status reset. Next send will test SMTP connection.' });
});

// Endpoint: Schedule or reschedule cohort invitations
app.post('/api/schedule-cohort-invitations', requireSignedIn, requireAdmin, (req, res) => {
  try {
    const { 
      scheduledTime, 
      recipients = [], 
      excludedEmails = [], 
      displayTime = '8:00 AM ET (Oct 24, 2026)',
      pacingIntervalSeconds = 60,
      timeFrameWindow = '8:00 AM – 10:00 AM ET (2-Hour Buffer Window)'
    } = req.body || {};

    const targetTime = scheduledTime || '2026-10-24T12:00:00.000Z';

    activeScheduledCampaign = {
      id: `scheduled_campaign_${Date.now()}`,
      status: 'scheduled',
      scheduledTime: targetTime,
      displayTime,
      timeFrameWindow,
      pacingIntervalSeconds: Number(pacingIntervalSeconds) || 60,
      recipients,
      excludedEmails: Array.from(new Set(
        (excludedEmails as string[]).concat(['excluded@example.com', 'excluded@example.com'])
      )),
      createdAt: new Date().toISOString()
    };

    console.log(`[Scheduler] Campaign armed for ${targetTime} (${displayTime}) with ${pacingIntervalSeconds}s pacing over 2-hour buffer`);
    res.json({ success: true, campaign: activeScheduledCampaign });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// Endpoint: Cancel scheduled invitations
app.post('/api/cancel-scheduled-invitations', requireSignedIn, requireAdmin, (_req, res) => {
  if (activeScheduledCampaign) {
    activeScheduledCampaign.status = 'cancelled';
  }
  res.json({ success: true, message: 'Scheduled campaign cancelled' });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();


