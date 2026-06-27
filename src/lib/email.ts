/**
 * Integration helper for sending emails via Resend HTTP API.
 * Compatible with Node.js and Next.js Edge Runtime (no heavy library dependency).
 */

const RESEND_API_URL = 'https://api.resend.com/emails';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email using the Resend REST API.
 */
export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY is not defined in the environment. Email was not sent.');
    return false;
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `PWA POS <${EMAIL_FROM}>`,
        to: [to],
        subject,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Resend API Error Response:', data);
      return false;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`✉️ Email successfully sent to ${to}. Resend ID:`, data.id);
    }
    return true;
  } catch (error) {
    console.error('❌ Failed to send email via Resend:', error);
    return false;
  }
}

/**
 * Builds a modern HTML template for password reset.
 */
export function getResetPasswordTemplate(name: string, resetLink: string): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Restablecer Contraseña</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background-color: #f8fafc;
          color: #334155;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }
        .header {
          background-color: #1B4FD8;
          color: #ffffff;
          padding: 32px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.025em;
        }
        .content {
          padding: 32px;
          line-height: 1.6;
        }
        .content p {
          margin: 0 0 16px;
          font-size: 16px;
        }
        .btn-wrapper {
          text-align: center;
          margin: 32px 0;
        }
        .btn {
          background-color: #1B4FD8;
          color: #ffffff !important;
          padding: 14px 28px;
          text-decoration: none;
          font-weight: 600;
          border-radius: 6px;
          display: inline-block;
          font-size: 16px;
          box-shadow: 0 4px 6px -1px rgba(27, 79, 216, 0.2);
        }
        .footer {
          background-color: #f8fafc;
          padding: 24px 32px;
          text-align: center;
          font-size: 14px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
        }
        .footer p {
          margin: 0 0 8px;
        }
        .footer a {
          color: #1B4FD8;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PWA-POS-INV</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${name}</strong>,</p>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de usuario.</p>
          <p>Para continuar, haz clic en el siguiente enlace. Este enlace es válido por los próximos <strong>30 minutos</strong>:</p>
          <div class="btn-wrapper">
            <a href="${resetLink}" class="btn" target="_blank">Restablecer Contraseña</a>
          </div>
          <p>Si no realizaste esta solicitud, puedes ignorar este correo de forma segura. Tu contraseña no cambiará hasta que accedas al enlace anterior.</p>
        </div>
        <div class="footer">
          <p>Este es un correo automático, por favor no respondas a él.</p>
          <p>&copy; 2026 PWA-POS-INV. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
