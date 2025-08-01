import nodemailer from 'nodemailer';

// Configuração do serviço de email
export const emailConfig = {
  // Configuração do servidor SMTP
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true para 465, false para outras portas
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  // Configurações adicionais
  from: process.env.EMAIL_FROM || 'noreply@pokerplanning.com',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@pokerplanning.com',
};

// Criar transporter do nodemailer
export const createTransporter = () => {
  return nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: emailConfig.auth,
  });
};

// Verificar se as configurações de email estão válidas
export const isEmailConfigured = () => {
  const hasHost = !!process.env.SMTP_HOST;
  const hasUser = !!process.env.SMTP_USER;
  const hasPass = !!process.env.SMTP_PASS;
  
  return hasHost && hasUser && hasPass;
};

// Configurações de rate limiting
export const emailRateLimit = {
  maxEmailsPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR || '10'),
  maxEmailsPerDay: parseInt(process.env.MAX_EMAILS_PER_DAY || '100'),
  resetPasswordCooldown: parseInt(process.env.RESET_PASSWORD_COOLDOWN || '300'), // 5 minutos
}; 