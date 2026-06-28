import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.email.configured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: env.email.secure,
      auth: { user: env.email.user, pass: env.email.pass },
    });
  }
  return transporter;
}

/**
 * Send an email. When SMTP isn't configured (the default for local/dev), the
 * message (including any action link) is logged to the console so the
 * forgot-password / verification flows remain fully testable without an email
 * account.
 */
async function deliver(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.log(
      `\n──────── [email:dev] (SMTP not configured) ────────\n` +
        `To:      ${to}\n` +
        `Subject: ${subject}\n` +
        `${text}\n` +
        `───────────────────────────────────────────────────\n`
    );
    return;
  }
  await t.sendMail({ from: env.email.from, to, subject, html, text });
}

function layout(title: string, body: string, cta: { label: string; url: string }): string {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#f6f6fb;padding:24px">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:28px">
      <h1 style="font-size:18px;color:#1a1a2e">${title}</h1>
      <p style="color:#444;line-height:1.5">${body}</p>
      <p style="margin:24px 0">
        <a href="${cta.url}" style="background:#7c5cff;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${cta.label}</a>
      </p>
      <p style="color:#888;font-size:12px">If the button doesn't work, paste this link into your browser:<br>${cta.url}</p>
    </div></body></html>`;
}

export async function sendVerificationEmail(to: string, link: string): Promise<void> {
  await deliver(
    to,
    'Verify your VeoLMS email',
    layout(
      'Confirm your email',
      'Welcome to VeoLMS! Confirm your email address to finish setting up your account.',
      { label: 'Verify email', url: link }
    ),
    `Verify your email: ${link}`
  );
}

export async function sendContactMessage(payload: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const { name, email, subject, message } = payload;
  const text =
    `New contact form submission:\n\n` +
    `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`;
  // Route to the configured "from" inbox (or the console in dev).
  await deliver(
    env.email.from,
    `[VeoLMS contact] ${subject}`,
    `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p><p>${message.replace(/\n/g, '<br>')}</p>`,
    text
  );
}

export async function sendPasswordResetEmail(to: string, link: string): Promise<void> {
  await deliver(
    to,
    'Reset your VeoLMS password',
    layout(
      'Reset your password',
      'We received a request to reset your password. This link expires in 1 hour. If you did not request it, you can ignore this email.',
      { label: 'Reset password', url: link }
    ),
    `Reset your password (expires in 1 hour): ${link}`
  );
}
