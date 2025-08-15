import jwt from 'jsonwebtoken';
import { APP_CONFIG } from '@/lib/config';

export interface PublicParticipantToken {
  participantId: string;
  sessionId: string;
  name: string;
  type: 'public_participant';
  iat: number;
  exp: number;
}

/**
 * Gera um token JWT para participante público
 */
export function generatePublicParticipantToken(participantId: string, sessionId: string, name: string): string {
  const payload: PublicParticipantToken = {
    participantId,
    sessionId,
    name,
    type: 'public_participant',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2 horas
  };

  return jwt.sign(payload, APP_CONFIG.JWT_SECRET);
}

/**
 * Verifica e decodifica um token de participante público
 */
export function verifyPublicParticipantToken(token: string): PublicParticipantToken | null {
  try {
    const decoded = jwt.verify(token, APP_CONFIG.JWT_SECRET) as PublicParticipantToken;
    
    // Verificar se é um token de participante público
    if (decoded.type !== 'public_participant') {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Middleware para verificar autenticação de participante público
 */
export function requirePublicParticipantAuth(token: string): PublicParticipantToken {
  const decoded = verifyPublicParticipantToken(token);
  if (!decoded) {
    throw new Error('Invalid or expired public participant token');
  }
  return decoded;
}
