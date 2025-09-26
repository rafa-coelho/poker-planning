import { createTransporter, isEmailConfigured, emailConfig, emailRateLimit } from './config';
import { APP_CONFIG } from '@nyx/config';

// Cache para rate limiting
const emailCache = new Map<string, { count: number; lastSent: number }>();

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailData {
  to: string;
  template: EmailTemplate;
  context?: Record<string, any>;
}

type SupportedLocale = 'pt' | 'en';

// Factory SRP: produce templates by type and locale
class EmailTemplateFactory {
  constructor(private readonly appName: string) {}

  passwordReset(locale: SupportedLocale, resetUrl: string, userName: string): EmailTemplate {
    return locale === 'en'
      ? this.passwordResetEn(resetUrl, userName)
      : this.passwordResetPt(resetUrl, userName);
  }

  invite(locale: SupportedLocale, inviteUrl: string, userName: string, organizationName: string, inviterName: string): EmailTemplate {
    return locale === 'en'
      ? this.inviteEn(inviteUrl, userName, organizationName, inviterName)
      : this.invitePt(inviteUrl, userName, organizationName, inviterName);
  }

  welcome(locale: SupportedLocale, loginUrl: string, userName: string): EmailTemplate {
    return locale === 'en'
      ? this.welcomeEn(loginUrl, userName)
      : this.welcomePt(loginUrl, userName);
  }

  private passwordResetPt(resetUrl: string, userName: string): EmailTemplate {
    return {
      subject: `Reset de Senha - ${this.appName}`,
      html: this.wrapHtml(`
        <div class="header">
          <h1>🃏 ${this.appName}</h1>
          <p>Reset de Senha</p>
        </div>
        <div class="content">
          <h2>Olá, ${userName}!</h2>
          <p>Recebemos uma solicitação para resetar sua senha.</p>
          <p>Clique no botão abaixo para criar uma nova senha:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Resetar Senha</a>
          </div>
          <div class="warning">
            <strong>⚠️ Importante:</strong>
            <ul>
              <li>Este link expira em 1 hora</li>
              <li>Se você não solicitou este reset, ignore este email</li>
              <li>Não compartilhe este link com ninguém</li>
            </ul>
          </div>
          <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
          <p style="word-break: break-all; color: #6b7280; font-size: 12px;">${resetUrl}</p>
        </div>
      `),
      text: `
Reset de Senha - ${this.appName}

Olá, ${userName}!

Recebemos uma solicitação para resetar sua senha.

Para criar uma nova senha, acesse este link:
${resetUrl}

⚠️ IMPORTANTE:
- Este link expira em 1 hora
- Se você não solicitou este reset, ignore este email
- Não compartilhe este link com ninguém

Se o link não funcionar, copie e cole no seu navegador:
${resetUrl}

Este email foi enviado automaticamente. Não responda a este email.

© 2025 ${this.appName}. Todos os direitos reservados.
      `.trim(),
    };
  }

  private passwordResetEn(resetUrl: string, userName: string): EmailTemplate {
    return {
      subject: `Password Reset - ${this.appName}`,
      html: this.wrapHtml(`
        <div class="header">
          <h1>🃏 ${this.appName}</h1>
          <p>Password Reset</p>
        </div>
        <div class="content">
          <h2>Hello, ${userName}!</h2>
          <p>We received a request to reset your password.</p>
          <p>Click the button below to create a new password:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul>
              <li>This link expires in 1 hour</li>
              <li>If you did not request this, ignore this email</li>
              <li>Do not share this link with anyone</li>
            </ul>
          </div>
          <p>If the button does not work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6b7280; font-size: 12px;">${resetUrl}</p>
        </div>
      `),
      text: `
Password Reset - ${this.appName}

Hello, ${userName}!

We received a request to reset your password.

To create a new password, visit this link:
${resetUrl}

⚠️ IMPORTANT:
- This link expires in 1 hour
- If you did not request this, ignore this email
- Do not share this link with anyone

If the link does not work, copy and paste it into your browser:
${resetUrl}

This email was sent automatically. Do not reply to this email.

© 2025 ${this.appName}. All rights reserved.
      `.trim(),
    };
  }

  private invitePt(inviteUrl: string, userName: string, organizationName: string, inviterName: string): EmailTemplate {
    return {
      subject: `Convite para ${organizationName} - ${this.appName} 🃏`,
      html: this.wrapHtml(`
        <div class="header">
          <h1>🃏 ${this.appName}</h1>
          <p>Você foi convidado!</p>
        </div>
        <div class="content">
          <h2>Olá, ${userName}! 👋</h2>
          <p><strong>${inviterName}</strong> convidou você para fazer parte da organização <strong>${organizationName}</strong> no ${this.appName}.</p>
          <div class="highlight">
            <h3>🎯 O que é o ${this.appName}?</h3>
            <p>Uma ferramenta colaborativa para estimativa ágil de projetos usando cartas do planning poker. Ajude sua equipe a estimar tarefas de forma mais precisa e consensual.</p>
          </div>
          <p><strong>Para aceitar o convite e definir sua senha:</strong></p>
          <div style="text-align: center;">
            <a href="${inviteUrl}" class="button">Aceitar Convite e Definir Senha</a>
          </div>
          <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
          <p style="word-break: break-all; color: #6b7280; font-size: 12px;">${inviteUrl}</p>
        </div>
      `),
      text: `
Convite para ${organizationName} - ${this.appName} 🃏

Olá, ${userName}! 👋

${inviterName} convidou você para fazer parte da organização ${organizationName} no ${this.appName}.

🎯 O que é o ${this.appName}?
Uma ferramenta colaborativa para estimativa ágil de projetos usando cartas do planning poker. Ajude sua equipe a estimar tarefas de forma mais precisa e consensual.

Para aceitar o convite e definir sua senha, acesse:
${inviteUrl}

Se o link não funcionar, copie e cole no seu navegador:
${inviteUrl}

© 2025 ${this.appName}. Todos os direitos reservados.
      `.trim(),
    };
  }

  private inviteEn(inviteUrl: string, userName: string, organizationName: string, inviterName: string): EmailTemplate {
    return {
      subject: `Invitation to ${organizationName} - ${this.appName} 🃏`,
      html: this.wrapHtml(`
        <div class="header">
          <h1>🃏 ${this.appName}</h1>
          <p>You've been invited!</p>
        </div>
        <div class="content">
          <h2>Hello, ${userName}! 👋</h2>
          <p><strong>${inviterName}</strong> invited you to join the <strong>${organizationName}</strong> organization on ${this.appName}.</p>
          <div class="highlight">
            <h3>🎯 What is ${this.appName}?</h3>
            <p>A collaborative tool for agile estimation using planning poker cards. Help your team estimate tasks more precisely and consensually.</p>
          </div>
          <p><strong>To accept the invitation and set your password:</strong></p>
          <div style="text-align: center;">
            <a href="${inviteUrl}" class="button">Accept Invitation and Set Password</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6b7280; font-size: 12px;">${inviteUrl}</p>
        </div>
      `),
      text: `
Invitation to ${organizationName} - ${this.appName} 🃏

Hello, ${userName}! 👋

${inviterName} invited you to join the ${organizationName} organization on ${this.appName}.

🎯 What is ${this.appName}?
A collaborative tool for agile estimation using planning poker cards. Help your team estimate tasks more precisely and consensually.

To accept the invitation and set your password, visit:
${inviteUrl}

If the link doesn't work, copy and paste it into your browser:
${inviteUrl}

© 2025 ${this.appName}. All rights reserved.
      `.trim(),
    };
  }

  private welcomePt(loginUrl: string, userName: string): EmailTemplate {
    return {
      subject: `Bem-vindo ao ${this.appName}! 🃏`,
      html: this.wrapHtml(`
        <div class="header">
          <h1>🃏 ${this.appName}</h1>
          <p>Bem-vindo à sua nova ferramenta de estimativas!</p>
        </div>
        <div class="content">
          <h2>Olá, ${userName}! 👋</h2>
          <p>Seja bem-vindo ao ${this.appName}! Sua conta foi criada com sucesso.</p>
          <div style="text-align: center;">
            <a href="${loginUrl}" class="button">Começar a Usar</a>
          </div>
        </div>
      `),
      text: `
Bem-vindo ao ${this.appName}! 🃏

Olá, ${userName}! 👋

Seja bem-vindo ao ${this.appName}! Sua conta foi criada com sucesso.

Para começar a usar, acesse: ${loginUrl}

© 2025 ${this.appName}. Todos os direitos reservados.
      `.trim(),
    };
  }

  private welcomeEn(loginUrl: string, userName: string): EmailTemplate {
    return {
      subject: `Welcome to ${this.appName}! 🃏`,
      html: this.wrapHtml(`
        <div class="header">
          <h1>🃏 ${this.appName}</h1>
          <p>Welcome to your new estimation tool!</p>
        </div>
        <div class="content">
          <h2>Hello, ${userName}! 👋</h2>
          <p>Welcome to ${this.appName}! Your account has been created successfully.</p>
          <div style="text-align: center;">
            <a href="${loginUrl}" class="button">Get Started</a>
          </div>
        </div>
      `),
      text: `
Welcome to ${this.appName}! 🃏

Hello, ${userName}! 👋

Welcome to ${this.appName}! Your account has been created successfully.

To get started, visit: ${loginUrl}

© 2025 ${this.appName}. All rights reserved.
      `.trim(),
    };
  }

  private wrapHtml(inner: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.appName}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .highlight { background: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    ${inner}
    <div class="footer">
      <p>Este email foi enviado automaticamente. Não responda a este email.</p>
      <p>© 2025 ${this.appName}. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>`;
  }
}

export class EmailService {
  private transporter: any;
  private readonly factory = new EmailTemplateFactory(APP_CONFIG.APP_NAME);

  constructor() {
    if (isEmailConfigured()) {
      this.transporter = createTransporter();
    }
  }

  /**
   * Verifica se o email está configurado
   */
  isConfigured(): boolean {
    return isEmailConfigured();
  }

  /**
   * Verifica rate limiting para um email específico
   */
  private checkRateLimit(email: string, type: 'hourly' | 'daily' | 'reset'): boolean {
    const key = `${email}:${type}`;
    const now = Date.now();
    const cache = emailCache.get(key);

    if (!cache) {
      emailCache.set(key, { count: 1, lastSent: now });
      return true;
    }

    const timeWindow = type === 'hourly' ? 3600000 : type === 'daily' ? 86400000 : emailRateLimit.resetPasswordCooldown * 1000;
    
    if (now - cache.lastSent < timeWindow) {
      if (cache.count >= (type === 'hourly' ? emailRateLimit.maxEmailsPerHour : type === 'daily' ? emailRateLimit.maxEmailsPerDay : 1)) {
        return false;
      }
      cache.count++;
    } else {
      emailCache.set(key, { count: 1, lastSent: now });
    }

    return true;
  }

  /**
   * Envia um email
   */
  async sendEmail(data: EmailData): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Email service not configured' };
    }

    // Verificar rate limiting
    if (!this.checkRateLimit(data.to, 'hourly')) {
      return { success: false, error: 'Rate limit exceeded (hourly)' };
    }

    if (!this.checkRateLimit(data.to, 'daily')) {
      return { success: false, error: 'Rate limit exceeded (daily)' };
    }

    try {
      const mailOptions = {
        from: emailConfig.from,
        to: data.to,
        subject: data.template.subject,
        html: data.template.html,
        text: data.template.text,
        replyTo: emailConfig.replyTo,
      };

      await this.transporter.sendMail(mailOptions);
      
      return { success: true };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Envia email de reset de senha
   */
  async sendPasswordResetEmail(email: string, resetToken: string, userName: string, locale: SupportedLocale = 'pt'): Promise<{ success: boolean; error?: string }> {
    // Verificar rate limiting específico para reset de senha
    if (!this.checkRateLimit(email, 'reset')) {
      return { success: false, error: 'Please wait before requesting another password reset' };
    }

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const template = this.factory.passwordReset(locale, resetUrl, userName);

    return this.sendEmail({ to: email, template });
  }

  /**
   * Envia email de convite para definir senha
   */
  async sendInviteEmail(
    email: string, 
    userName: string, 
    inviteToken: string, 
    organizationName: string,
    inviterName: string,
    locale: SupportedLocale = 'pt'
  ): Promise<{ success: boolean; error?: string }> {
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${inviteToken}&type=invite`;
    
    const template = this.factory.invite(locale, inviteUrl, userName, organizationName, inviterName);

    return this.sendEmail({ to: email, template });
  }

  /**
   * Envia email de boas-vindas
   */
  async sendWelcomeEmail(email: string, userName: string, locale: SupportedLocale = 'pt'): Promise<{ success: boolean; error?: string }> {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`;
    
    const template = this.factory.welcome(locale, loginUrl, userName);

    return this.sendEmail({ to: email, template });
  }
}

// Instância singleton do serviço de email
export const emailService = new EmailService(); 