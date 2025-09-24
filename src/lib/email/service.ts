import { createTransporter, isEmailConfigured, emailConfig, emailRateLimit } from './config';
import { APP_CONFIG } from '@/lib/config';

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

export class EmailService {
  private transporter: any;

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
  async sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<{ success: boolean; error?: string }> {
    // Verificar rate limiting específico para reset de senha
    if (!this.checkRateLimit(email, 'reset')) {
      return { success: false, error: 'Please wait before requesting another password reset' };
    }

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const template: EmailTemplate = {
      subject: `Reset de Senha - ${APP_CONFIG.APP_NAME}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset de Senha</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🃏 ${APP_CONFIG.APP_NAME}</h1>
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
            <div class="footer">
              <p>Este email foi enviado automaticamente. Não responda a este email.</p>
              <p>© 2024 ${APP_CONFIG.APP_NAME}. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Reset de Senha - ${APP_CONFIG.APP_NAME}

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

© 2024 ${APP_CONFIG.APP_NAME}. Todos os direitos reservados.
      `,
    };

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
    inviterName: string
  ): Promise<{ success: boolean; error?: string }> {
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${inviteToken}&type=invite`;
    
    const template: EmailTemplate = {
      subject: `Convite para ${organizationName} - ${APP_CONFIG.APP_NAME} 🃏`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Convite para ${organizationName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .highlight { background: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🃏 ${APP_CONFIG.APP_NAME}</h1>
              <p>Você foi convidado!</p>
            </div>
            <div class="content">
              <h2>Olá, ${userName}! 👋</h2>
              <p><strong>${inviterName}</strong> convidou você para fazer parte da organização <strong>${organizationName}</strong> no ${APP_CONFIG.APP_NAME}.</p>
              
              <div class="highlight">
                <h3>🎯 O que é o ${APP_CONFIG.APP_NAME}?</h3>
                <p>Uma ferramenta colaborativa para estimativa ágil de projetos usando cartas do planning poker. Ajude sua equipe a estimar tarefas de forma mais precisa e consensual.</p>
              </div>
              
              <p><strong>Para aceitar o convite e definir sua senha:</strong></p>
              
              <div style="text-align: center;">
                <a href="${inviteUrl}" class="button">Aceitar Convite e Definir Senha</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul>
                  <li>Este convite expira em 72 horas</li>
                  <li>Você precisará criar uma senha para acessar sua conta</li>
                  <li>Não compartilhe este link com outras pessoas</li>
                </ul>
              </div>
              
              <p><strong>Após criar sua conta, você poderá:</strong></p>
              <ul>
                <li>📊 Participar de sessões de estimativa</li>
                <li>👥 Colaborar com sua equipe em tempo real</li>
                <li>📈 Visualizar histórico de estimativas</li>
                <li>⚡ Usar diferentes tipos de cartas (Fibonacci, T-shirt, etc.)</li>
              </ul>
              
              <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; color: #6b7280; font-size: 12px;">${inviteUrl}</p>
            </div>
            <div class="footer">
              <p>Este email foi enviado automaticamente. Não responda a este email.</p>
              <p>© 2024 ${APP_CONFIG.APP_NAME}. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Convite para ${organizationName} - ${APP_CONFIG.APP_NAME} 🃏

Olá, ${userName}! 👋

${inviterName} convidou você para fazer parte da organização ${organizationName} no ${APP_CONFIG.APP_NAME}.

🎯 O que é o ${APP_CONFIG.APP_NAME}?
Uma ferramenta colaborativa para estimativa ágil de projetos usando cartas do planning poker. Ajude sua equipe a estimar tarefas de forma mais precisa e consensual.

Para aceitar o convite e definir sua senha, acesse:
${inviteUrl}

⚠️ IMPORTANTE:
- Este convite expira em 72 horas
- Você precisará criar uma senha para acessar sua conta
- Não compartilhe este link com outras pessoas

Após criar sua conta, você poderá:
📊 Participar de sessões de estimativa
👥 Colaborar com sua equipe em tempo real
📈 Visualizar histórico de estimativas
⚡ Usar diferentes tipos de cartas (Fibonacci, T-shirt, etc.)

Se o link não funcionar, copie e cole no seu navegador:
${inviteUrl}

Este email foi enviado automaticamente. Não responda a este email.

© 2024 ${APP_CONFIG.APP_NAME}. Todos os direitos reservados.
      `,
    };

    return this.sendEmail({ to: email, template });
  }

  /**
   * Envia email de boas-vindas
   */
  async sendWelcomeEmail(email: string, userName: string): Promise<{ success: boolean; error?: string }> {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`;
    
    const template: EmailTemplate = {
      subject: `Bem-vindo ao ${APP_CONFIG.APP_NAME}! 🃏`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bem-vindo ao ${APP_CONFIG.APP_NAME}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .features { margin: 20px 0; }
            .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #3b82f6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🃏 ${APP_CONFIG.APP_NAME}</h1>
              <p>Bem-vindo à sua nova ferramenta de estimativas!</p>
            </div>
            <div class="content">
              <h2>Olá, ${userName}! 👋</h2>
              <p>Seja bem-vindo ao ${APP_CONFIG.APP_NAME}! Sua conta foi criada com sucesso.</p>
              
              <div class="features">
                <h3>🎯 O que você pode fazer:</h3>
                <div class="feature">
                  <strong>📊 Estimativas Ágeis:</strong> Use cartas do planning poker para estimar tarefas
                </div>
                <div class="feature">
                  <strong>👥 Sessões Colaborativas:</strong> Convide sua equipe para participar
                </div>
                <div class="feature">
                  <strong>📈 Histórico Completo:</strong> Mantenha registro de todas as estimativas
                </div>
                <div class="feature">
                  <strong>⚡ Tempo Real:</strong> Atualizações instantâneas para todos os participantes
                </div>
              </div>
              
              <div style="text-align: center;">
                <a href="${loginUrl}" class="button">Começar a Usar</a>
              </div>
              
              <p><strong>Próximos passos:</strong></p>
              <ol>
                <li>Faça login na sua conta</li>
                <li>Crie sua primeira sessão de planning poker</li>
                <li>Convide sua equipe</li>
                <li>Comece a estimar!</li>
              </ol>
            </div>
            <div class="footer">
              <p>Precisa de ajuda? Entre em contato conosco.</p>
              <p>© 2024 ${APP_CONFIG.APP_NAME}. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Bem-vindo ao ${APP_CONFIG.APP_NAME}! 🃏

Olá, ${userName}! 👋

Seja bem-vindo ao ${APP_CONFIG.APP_NAME}! Sua conta foi criada com sucesso.

🎯 O que você pode fazer:
📊 Estimativas Ágeis: Use cartas do planning poker para estimar tarefas
👥 Sessões Colaborativas: Convide sua equipe para participar
📈 Histórico Completo: Mantenha registro de todas as estimativas
⚡ Tempo Real: Atualizações instantâneas para todos os participantes

Para começar a usar, acesse: ${loginUrl}

Próximos passos:
1. Faça login na sua conta
2. Crie sua primeira sessão de planning poker
3. Convide sua equipe
4. Comece a estimar!

Precisa de ajuda? Entre em contato conosco.

© 2024 ${APP_CONFIG.APP_NAME}. Todos os direitos reservados.
      `,
    };

    return this.sendEmail({ to: email, template });
  }
}

// Instância singleton do serviço de email
export const emailService = new EmailService(); 