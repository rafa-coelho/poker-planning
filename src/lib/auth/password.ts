import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { APP_CONFIG } from '@/lib/config'

/**
 * Configurações para hashing de senhas
 */
const SALT_ROUNDS = APP_CONFIG.PASSWORD_SALT_ROUNDS

/**
 * Critérios para validação de senha
 */
export const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false // Opcional para melhor UX
} as const

/**
 * Cria hash seguro da senha usando bcrypt
 * @param password Senha em texto plano
 * @returns Promise com hash da senha
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < PASSWORD_RULES.minLength) {
    throw new Error(`Senha deve ter pelo menos ${PASSWORD_RULES.minLength} caracteres`)
  }
  
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verifica se a senha corresponde ao hash
 * @param password Senha em texto plano
 * @param hash Hash armazenado no banco
 * @returns Promise com resultado da verificação
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false
  }
  
  return bcrypt.compare(password, hash)
}

/**
 * Valida se a senha atende aos critérios de segurança
 * @param password Senha a ser validada
 * @returns Objeto com resultado da validação
 */
export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (!password) {
    errors.push('Senha é obrigatória')
    return { isValid: false, errors }
  }
  
  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(`Senha deve ter pelo menos ${PASSWORD_RULES.minLength} caracteres`)
  }
  
  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula')
  }
  
  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula')
  }
  
  if (PASSWORD_RULES.requireNumbers && !/\d/.test(password)) {
    errors.push('Senha deve conter pelo menos um número')
  }
  
  if (PASSWORD_RULES.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Senha deve conter pelo menos um caractere especial')
  }
  
  // Verificar padrões comuns inseguros
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'user']
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('Senha não pode conter padrões comuns')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Gera uma senha temporária segura
 * @param length Tamanho da senha (padrão: 12)
 * @returns Senha temporária
 */
export function generateTemporaryPassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  
  const allChars = lowercase + uppercase + numbers + symbols
  
  let password = ''
  
  // Garantir pelo menos um caractere de cada tipo
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]
  
  // Preencher o resto aleatoriamente
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Embaralhar a senha
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Gera um token seguro para reset de senha
 * @param userId ID do usuário
 * @returns Promise com token de reset
 */
export async function generatePasswordResetToken(userId: string): Promise<string> {
  // Gerar token aleatório seguro
  const token = crypto.randomBytes(32).toString('hex')
  
  // Hash do token para armazenamento seguro
  const hashedToken = await hashPassword(token)
  
  // TODO: Armazenar o hash do token no banco com expiração
  // Por enquanto, apenas retornamos o token
  // Em produção, você deve:
  // 1. Salvar o hash no banco com userId e expiração
  // 2. Enviar o token original por email
  // 3. Verificar o hash ao resetar a senha
  
  return token
}

/**
 * Verifica se um token de reset é válido
 * @param token Token fornecido pelo usuário
 * @param hashedToken Hash armazenado no banco
 * @returns Promise com resultado da verificação
 */
export async function verifyPasswordResetToken(token: string, hashedToken: string): Promise<boolean> {
  return verifyPassword(token, hashedToken)
} 