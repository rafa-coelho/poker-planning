import { jwt } from './jwt';

export interface TempParticipantToken {
  participantId: string;
  sessionId: string;
  type: 'temp_participant';
  iat: number;
  exp: number;
}

/**
 * Gera um token temporário para participante pendente
 */
export function generateTempParticipantToken(participantId: string, sessionId: string): string {
  const payload: TempParticipantToken = {
    participantId,
    sessionId,
    type: 'temp_participant',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 60) // 30 minutos
  };

  return jwt.sign(payload, process.env.JWT_SECRET!);
}

/**
 * Verifica e decodifica um token temporário de participante
 */
export function verifyTempParticipantToken(token: string): TempParticipantToken | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TempParticipantToken;
    
    // Verificar se é um token temporário
    if (decoded.type !== 'temp_participant') {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Middleware para verificar autenticação temporária de participante
 */
export function requireTempParticipantAuth(token: string): TempParticipantToken {
  const decoded = verifyTempParticipantToken(token);
  if (!decoded) {
    throw new Error('Invalid or expired temporary participant token');
  }
  return decoded;
}
