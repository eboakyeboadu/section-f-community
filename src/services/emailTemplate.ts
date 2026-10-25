export interface WelcomeEmailData {
  displayName: string;
  email: string;
  hbsEmail?: string;
  campusHousing?: string;
  appUrl?: string;
  photoUrl?: string;
}

export function generateWelcomeEmailHtml(data: WelcomeEmailData): string {
  const name = data.displayName || 'Classmate';
  const email = data.email || '';
  const hbsEmail = data.hbsEmail || email;
  const housing = data.campusHousing || 'Soldiers Field Park';
  const appUrl = data.appUrl && !data.appUrl.includes('run.app') ? data.appUrl : 'https://sectionf28.ai.studio';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Section F Community Hub</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    a {
      text-decoration: none;
    }
  </style>
</head>
<body bgcolor="#ffffff" style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="background-color: #ffffff; width: 100%;">
    <tr>
      <td align="center" bgcolor="#ffffff" style="padding: 32px 12px 50px 12px; background-color: #ffffff;">
        
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#171226" style="max-width: 580px; background-color: #171226; border: 1px solid #2e244a; border-radius: 28px; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.18);">
          
          <!-- Top Accent Bar -->
          <tr>
            <td height="6" bgcolor="#A51C30" style="background: linear-gradient(90deg, #A51C30 0%, #F59E0B 50%, #7E22CE 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td align="center" bgcolor="#171226" style="padding: 38px 32px 24px 32px; text-align: center; background-color: #171226;">
              
              <!-- Harvard Business School Typography (Clean white, no container) -->
              <div style="margin-bottom: 12px; font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: #ffffff;">
                HARVARD BUSINESS SCHOOL
              </div>

              <!-- Main Title -->
              <h1 style="margin: 0 0 6px 0; font-family: 'EB Garamond', Georgia, serif; font-size: 32px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #ffffff;">
                SECTION F COMMUNITY HUB
              </h1>
              <p style="margin: 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #94a3b8; font-weight: 600;">
                CLASS OF 2028 DIRECTORY
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td bgcolor="#171226" style="padding: 0 32px; background-color: #171226;">
              <div style="border-top: 1px solid #2e244a; width: 100%;"></div>
            </td>
          </tr>

          <!-- Greeting & Welcome Message -->
          <tr>
            <td bgcolor="#171226" style="padding: 28px 32px 20px 32px; background-color: #171226;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #ffffff;">
                Welcome to Section F, ${name}! 🎓
              </h2>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Your Section F profile has been successfully claimed and linked. You now have full access to our mobile directory, interactive classmate world map, and cohort networking hub.
              </p>
            </td>
          </tr>

          <!-- Profile Snapshot Card -->
          <tr>
            <td bgcolor="#171226" style="padding: 0 32px 28px 32px; background-color: #171226;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#211e2a" style="background-color: #211e2a; border: 1px solid #373340; border-radius: 20px; overflow: hidden;">
                <tr>
                  <td bgcolor="#211e2a" style="padding: 20px 24px; background-color: #211e2a;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding-bottom: 12px; border-bottom: 1px solid #2e244a;">
                          <span style="font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #f59e0b;">
                            YOUR COMMUNITY HUB PROFILE
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 14px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="4" border="0">
                            <tr>
                              <td width="35%" style="font-size: 12px; color: #94a3b8; font-weight: 500;">Classmate:</td>
                              <td style="font-size: 13px; color: #ffffff; font-weight: 600;">${name}</td>
                            </tr>
                            <tr>
                              <td style="font-size: 12px; color: #94a3b8; font-weight: 500;">Section:</td>
                              <td style="font-size: 13px; color: #f59e0b; font-weight: 600;">Section F · MBA 2028</td>
                            </tr>
                            <tr>
                              <td style="font-size: 12px; color: #94a3b8; font-weight: 500;">Account:</td>
                              <td style="font-size: 13px; color: #e2e8f0; font-family: monospace;">${hbsEmail}</td>
                            </tr>
                            <tr>
                              <td style="font-size: 12px; color: #94a3b8; font-weight: 500;">Status:</td>
                              <td style="font-size: 13px; color: #34d399; font-weight: 600;">✓ Directory Profile Claimed &amp; Active</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Next Steps Checklist -->
          <tr>
            <td bgcolor="#171226" style="padding: 0 32px 32px 32px; background-color: #171226;">
              <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #f59e0b;">
                Quick Steps to Get Started:
              </h3>
              
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <!-- Step 1 -->
                <tr>
                  <td width="36" valign="top" style="padding-bottom: 16px;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background-color: #581c87; color: #f59e0b; text-align: center; line-height: 28px; font-weight: 700; font-size: 12px;">
                      1
                    </div>
                  </td>
                  <td valign="top" style="padding-bottom: 16px; padding-left: 8px;">
                    <strong style="color: #ffffff; font-size: 13px; display: block; margin-bottom: 2px;">
                      📸 Update Your Profile Photos
                    </strong>
                    <span style="font-size: 12px; color: #94a3b8; line-height: 1.4;">
                      Update your profile picture or share additional lifestyle and fun photos to your profile so classmates can connect with your story.
                    </span>
                  </td>
                </tr>

                <!-- Step 2 -->
                <tr>
                  <td width="36" valign="top" style="padding-bottom: 16px;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background-color: #581c87; color: #f59e0b; text-align: center; line-height: 28px; font-weight: 700; font-size: 12px;">
                      2
                    </div>
                  </td>
                  <td valign="top" style="padding-bottom: 16px; padding-left: 8px;">
                    <strong style="color: #ffffff; font-size: 13px; display: block; margin-bottom: 2px;">
                      ☕ Coffee Chats &amp; Meetups
                    </strong>
                    <span style="font-size: 12px; color: #94a3b8; line-height: 1.4;">
                      Send coffee chat invites to classmates to connect, catch up, and share memorable times together.
                    </span>
                  </td>
                </tr>

                <!-- Step 3 -->
                <tr>
                  <td width="36" valign="top" style="padding-bottom: 8px;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background-color: #581c87; color: #f59e0b; text-align: center; line-height: 28px; font-weight: 700; font-size: 12px;">
                      3
                    </div>
                  </td>
                  <td valign="top" style="padding-bottom: 8px; padding-left: 8px;">
                    <strong style="color: #ffffff; font-size: 13px; display: block; margin-bottom: 2px;">
                      🗺️ Explore Classmate Stats &amp; Global Atlas
                    </strong>
                    <span style="font-size: 12px; color: #94a3b8; line-height: 1.4;">
                      Explore where everyone comes from on the interactive map, along with career backgrounds and cohort interest statistics.
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Primary CTA Button -->
          <tr>
            <td align="center" bgcolor="#171226" style="padding: 0 32px 36px 32px; background-color: #171226;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #581c87 0%, #7e22ce 100%); border-radius: 100px; box-shadow: 0 10px 25px rgba(88,28,135,0.4);">
                    <a href="https://sectionf28.ai.studio" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #ffffff; text-decoration: none;">
                      Go to the App &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#120e1e" style="background-color: #120e1e; padding: 24px 32px; border-top: 1px solid #2e244a; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b; font-weight: 500;">
                Harvard Business School · MBA Class of 2028 · Section F
              </p>
              <p style="margin: 0; font-size: 10px; color: #475569;">
                This email is automatically generated by the Section F Community Hub.
              </p>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface ClaimInvitationEmailData {
  displayName: string;
  email: string;
  hbsEmail?: string;
  appUrl?: string;
}

export function generateClaimInvitationEmailHtml(data: ClaimInvitationEmailData): string {
  const name = data.displayName || 'Classmate';
  const appUrl = 'https://sectionf28.ai.studio/api/track/email-click?c=claim_invitation';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claim your Section F Profile</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    a {
      text-decoration: none;
    }
  </style>
</head>
<body bgcolor="#ffffff" style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="background-color: #ffffff; width: 100%;">
    <tr>
      <td align="center" bgcolor="#ffffff" style="padding: 32px 12px 50px 12px; background-color: #ffffff;">
        
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#171226" style="max-width: 580px; background-color: #171226; border: 1px solid #2e244a; border-radius: 28px; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.18);">
          
          <!-- Top Accent Bar -->
          <tr>
            <td height="6" bgcolor="#A51C30" style="background: linear-gradient(90deg, #A51C30 0%, #F59E0B 50%, #7E22CE 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header Section (Clean typography, no border boxes) -->
          <tr>
            <td align="center" bgcolor="#171226" style="padding: 38px 32px 22px 32px; text-align: center; background-color: #171226;">
              <div style="margin-bottom: 10px; font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: #ffffff;">
                HARVARD BUSINESS SCHOOL
              </div>
              
              <div style="margin-bottom: 16px; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #fbbf24;">
                SECTION F · CLASS OF 2028
              </div>

              <h1 style="margin: 0 0 12px 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.25;">
                Claim Your Section F Card 👋
              </h1>
              <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.5; max-width: 460px;">
                Hi <strong style="color: #ffffff;">${name}</strong>, your classmate profile in our Section F Community Hub is ready for you!
              </p>
            </td>
          </tr>

          <!-- Feature Callouts (Directly on background, no boxy borders) -->
          <tr>
            <td style="padding: 0 36px 26px 36px; background-color: #171226;">
              
              <div style="font-size: 13px; font-weight: 700; color: #fbbf24; margin-bottom: 6px;">
                ⚡ Takes about 30 seconds to complete
              </div>
              <p style="margin: 0 0 18px 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
                Your profile has already been pre-loaded with your section directory details. Claim it and customize:
              </p>

              <!-- Feature 1: Photos -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 14px;">
                <tr>
                  <td width="28" valign="top" style="font-size: 16px; line-height: 1.2;">
                    📸
                  </td>
                  <td valign="top" style="padding-left: 6px;">
                    <strong style="color: #ffffff; font-size: 13px; display: block; margin-bottom: 2px;">Upload your favorite photos</strong>
                    <span style="font-size: 12px; color: #94a3b8; line-height: 1.4;">Add a headshot so classmates can recognize you in the deck and in Aldrich.</span>
                  </td>
                </tr>
              </table>

              <!-- Feature 2: Dorm & Hometown -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 14px;">
                <tr>
                  <td width="28" valign="top" style="font-size: 16px; line-height: 1.2;">
                    📍
                  </td>
                  <td valign="top" style="padding-left: 6px;">
                    <strong style="color: #ffffff; font-size: 13px; display: block; margin-bottom: 2px;">Confirm dorm &amp; hometown</strong>
                    <span style="font-size: 12px; color: #94a3b8; line-height: 1.4;">See which Section F neighbors live in your building (SFP, McCulloch, Gallatin, etc.).</span>
                  </td>
                </tr>
              </table>

              <!-- Feature 3: Coffee Chats -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="28" valign="top" style="font-size: 16px; line-height: 1.2;">
                    ☕
                  </td>
                  <td valign="top" style="padding-left: 6px;">
                    <strong style="color: #ffffff; font-size: 13px; display: block; margin-bottom: 2px;">Connect for coffee chats</strong>
                    <span style="font-size: 12px; color: #94a3b8; line-height: 1.4;">Send and receive 1-on-1 coffee chat invitations with fellow section-mates.</span>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Primary CTA Button (Compact, single line, nowrap, official URL) -->
          <tr>
            <td align="center" bgcolor="#171226" style="padding: 6px 32px 36px 32px; background-color: #171226;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #7e22ce 0%, #a855f7 100%); border-radius: 100px; box-shadow: 0 8px 20px rgba(126, 34, 206, 0.35);">
                    <a href="${appUrl}" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #ffffff; text-decoration: none; white-space: nowrap;">
                      Claim Your Profile &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#120e1e" style="background-color: #120e1e; padding: 24px 32px; border-top: 1px solid #2e244a; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b; font-weight: 500;">
                Harvard Business School · MBA Class of 2028 · Section F
              </p>
              <p style="margin: 0; font-size: 10px; color: #475569;">
                This email is automatically generated by the Section F Community Hub.
              </p>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface CustomEmailData {
  title?: string;
  preheader?: string;
  badge?: string;
  greeting?: string;
  bodyParagraphs?: string[];
  paragraphs?: string[];
  bulletPoints?: string[];
  bullets?: string[];
  buttonText?: string;
  buttonUrl?: string;
  recipientName?: string;
  footerDisclaimer?: string;
  footerText?: string;
}

export function generateCustomEmailHtml(data: CustomEmailData): string {
  const title = data.title || 'SECTION F COMMUNITY HUB';
  const badge = data.badge || 'SECTION F · CLASS OF 2028';
  const greeting = data.greeting !== undefined 
    ? data.greeting 
    : (data.recipientName ? `Hi ${data.recipientName},` : 'Hello Section F,');
  const paragraphs = data.paragraphs || data.bodyParagraphs || [];
  const bullets = data.bullets || data.bulletPoints || [];
  const buttonText = data.buttonText || 'Open Section F Hub';
  const rawButtonUrl = data.buttonUrl || 'https://sectionf28.ai.studio';
  const buttonUrl = rawButtonUrl.includes('run.app') ? 'https://sectionf28.ai.studio' : rawButtonUrl;
  const preheader = data.preheader || 'Section F Directory & Community Update';
  const footerText = data.footerText || data.footerDisclaimer || 'This email was dispatched from the Section F Community Hub administrator suite.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    a { text-decoration: none; }
  </style>
</head>
<body bgcolor="#ffffff" style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #ffffff;">
    ${preheader}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="background-color: #ffffff; width: 100%;">
    <tr>
      <td align="center" bgcolor="#ffffff" style="padding: 32px 12px 50px 12px; background-color: #ffffff;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#171226" style="max-width: 580px; background-color: #171226; border: 1px solid #2e244a; border-radius: 28px; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.18);">
          <tr>
            <td height="6" bgcolor="#A51C30" style="background: linear-gradient(90deg, #A51C30 0%, #F59E0B 50%, #7E22CE 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <tr>
            <td align="center" bgcolor="#171226" style="padding: 36px 32px 20px 32px; text-align: center; background-color: #171226;">
              <div style="margin-bottom: 8px; font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: #ffffff;">
                HARVARD BUSINESS SCHOOL
              </div>
              <div style="margin-bottom: 14px; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #fbbf24;">
                ${badge}
              </div>
              <h1 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.25;">
                ${title}
              </h1>
            </td>
          </tr>
          <tr>
            <td bgcolor="#171226" style="padding: 0 32px; background-color: #171226;">
              <div style="border-top: 1px solid #2e244a; width: 100%;"></div>
            </td>
          </tr>
          <tr>
            <td bgcolor="#171226" style="padding: 24px 32px 16px 32px; background-color: #171226;">
              ${greeting ? `<h2 style="margin: 0 0 14px 0; font-size: 17px; font-weight: 600; color: #ffffff;">${greeting}</h2>` : ''}
              ${paragraphs.map((p) => `<p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">${p}</p>`).join('')}
              ${bullets.length > 0 ? `
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 16px 0 20px 0;">
                  ${bullets.map((b) => `
                    <tr>
                      <td width="20" valign="top" style="padding-bottom: 8px; color: #fbbf24; font-size: 14px;">✦</td>
                      <td valign="top" style="padding-bottom: 8px; font-size: 13px; color: #e2e8f0; line-height: 1.5;">${b}</td>
                    </tr>
                  `).join('')}
                </table>
              ` : ''}
            </td>
          </tr>
          ${buttonText ? `
          <tr>
            <td align="center" bgcolor="#171226" style="padding: 10px 32px 32px 32px; background-color: #171226;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #7e22ce 0%, #a855f7 100%); border-radius: 100px; box-shadow: 0 8px 20px rgba(126, 34, 206, 0.35);">
                    <a href="${buttonUrl}" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #ffffff; text-decoration: none; white-space: nowrap;">
                      ${buttonText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td bgcolor="#120e1e" style="background-color: #120e1e; padding: 22px 32px; border-top: 1px solid #2e244a; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b; font-weight: 500;">
                Harvard Business School · MBA Class of 2028 · Section F
              </p>
              <p style="margin: 0; font-size: 10px; color: #475569;">
                ${footerText}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}


