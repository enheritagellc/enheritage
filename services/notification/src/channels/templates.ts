/**
 * Notification templates — maps event types to subject + HTML + text bodies.
 *
 * Each template function receives the raw SQS event payload and returns the
 * rendered notification content.
 */

export interface RenderedTemplate {
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

type TemplateData = Record<string, unknown>;

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${title}</title>
<style>
  body { font-family: Georgia, serif; color: #3d3d3d; background: #fafafa; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background: #8B6914; padding: 32px 40px; }
  .header h1 { color: #fff; margin: 0; font-size: 22px; letter-spacing: 0.5px; }
  .content { padding: 32px 40px; }
  .content p { line-height: 1.7; margin: 0 0 16px; }
  .btn { display: inline-block; margin-top: 8px; padding: 12px 28px; background: #8B6914; color: #fff; text-decoration: none; border-radius: 4px; font-family: sans-serif; font-size: 14px; }
  .footer { padding: 24px 40px; font-family: sans-serif; font-size: 12px; color: #999; border-top: 1px solid #eee; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>Enheritage</h1></div>
  <div class="content">${body}</div>
  <div class="footer">You received this email because you have an Enheritage account. © ${new Date().getFullYear()} Enheritage.</div>
</div>
</body>
</html>`;
}

// ── Templates ─────────────────────────────────────────────────────────────────

const TEMPLATES: Record<string, (data: TemplateData) => RenderedTemplate> = {

  'keepsake.complete': (data) => {
    const name = String(data['subjectName'] ?? 'your loved one');
    const subject = `Your Enheritage keepsake is ready`;
    const bodyHtml = wrap(
      subject,
      `<p>Great news — the biography keepsake for <strong>${name}</strong> has been rendered and is ready to download.</p>
       <p>Log in to your Enheritage account to view and download your digital biography PDF.</p>
       <a class="btn" href="https://app.enheritage.com/keepsakes">View Keepsake</a>`,
    );
    const bodyText = `Your Enheritage keepsake for ${name} is ready.\n\nLog in to https://app.enheritage.com/keepsakes to download your biography PDF.`;
    return { subject, bodyHtml, bodyText };
  },

  'biography.complete': (data) => {
    const name = String(data['subjectName'] ?? 'your loved one');
    const subject = `Biography generated for ${name}`;
    const bodyHtml = wrap(
      subject,
      `<p>The AI-generated biography for <strong>${name}</strong> is complete and ready for your review.</p>
       <p>Log in to Enheritage to read, edit, and turn it into a beautiful printed keepsake.</p>
       <a class="btn" href="https://app.enheritage.com/biography">View Biography</a>`,
    );
    const bodyText = `The biography for ${name} is ready.\n\nVisit https://app.enheritage.com/biography to review it.`;
    return { subject, bodyHtml, bodyText };
  },

  'interview.transcription_complete': (data) => {
    const title = String(data['interviewTitle'] ?? 'your interview');
    const subject = `Transcription complete: "${title}"`;
    const bodyHtml = wrap(
      subject,
      `<p>The transcription for <em>${title}</em> has finished processing.</p>
       <p>Enheritage will now extract key life events and begin generating the biography.</p>
       <a class="btn" href="https://app.enheritage.com/interviews">View Interviews</a>`,
    );
    const bodyText = `Transcription for "${title}" is complete. Enheritage is now extracting life events and generating the biography.`;
    return { subject, bodyHtml, bodyText };
  },

  'keepsake.shipped': (data) => {
    const tracking = String(data['trackingNumber'] ?? '');
    const subject = `Your Enheritage keepsake has shipped!`;
    const bodyHtml = wrap(
      subject,
      `<p>Your printed keepsake is on its way!</p>
       ${tracking ? `<p>Tracking number: <strong>${tracking}</strong></p>` : ''}
       <p>Expected delivery in 5–7 business days.</p>`,
    );
    const bodyText = `Your keepsake has shipped!${tracking ? ` Tracking: ${tracking}.` : ''} Expected in 5–7 business days.`;
    return { subject, bodyHtml, bodyText };
  },
};

export function renderTemplate(eventType: string, data: TemplateData): RenderedTemplate | null {
  const fn = TEMPLATES[eventType];
  if (!fn) return null;
  return fn(data);
}

export function supportedEventTypes(): string[] {
  return Object.keys(TEMPLATES);
}
