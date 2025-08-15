// Tipos para o sistema de acesso público

export interface PublicAccessRequest {
  name: string;
}

export interface PublicAccessResponse {
  success: boolean;
  data?: {
    sessionId: string;
    name: string;
    description?: string;
    status: string;
    requiresApproval: boolean;
    votingMode: string;
    autoReveal: boolean;
    allowObservers: boolean;
    currentUser: {
      isLoggedIn: boolean;
      hasAccess: boolean;
      user?: {
        id: string;
        name: string;
        email: string;
        role: string;
      };
    };
    session: {
      createdAt: string;
      createdBy: {
        name: string;
        email: string;
      };
      participantsCount: number;
      publicParticipantsCount: number;
    };
  };
  error?: {
    code: string;
    message: string;
    timestamp: string;
  };
}

export interface PublicParticipantRequest {
  name: string;
}

export interface PublicParticipantResponse {
  success: boolean;
  data?: {
    participantId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    message: string;
  };
  error?: {
    code: string;
    message: string;
    timestamp: string;
  };
}

export interface PublicParticipant {
  id: string;
  sessionId: string;
  name: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  approvedBy?: string;
  approvedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicParticipantsListResponse {
  success: boolean;
  data?: PublicParticipant[];
  error?: {
    code: string;
    message: string;
    timestamp: string;
  };
}

export interface PublicParticipantActionRequest {
  action: 'APPROVE' | 'REJECT';
}

export interface PublicParticipantActionResponse {
  success: boolean;
  data?: {
    participantId: string;
    status: 'APPROVED' | 'REJECTED';
    message: string;
  };
  error?: {
    code: string;
    message: string;
    timestamp: string;
  };
}

// WebSocket Events
export interface WebSocketPublicAccessEvents {
  'public-access-requested': {
    sessionId: string;
    participantId: string;
    participant: {
      name: string;
      email?: string;
      createdAt: string;
    };
  };
  'public-access-approved': {
    sessionId: string;
    participantId: string;
    participant: {
      name: string;
      email?: string;
    };
  };
  'public-access-rejected': {
    sessionId: string;
    participantId: string;
    participant: {
      name: string;
      email?: string;
    };
  };
}
