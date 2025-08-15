import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withTenantIsolation } from '@/lib/middleware/tenant';
import { requirePermission } from '@/lib/middleware/authorization';

// GET /api/reports/export - Exportar relatórios em CSV
export const GET = withTenantIsolation(async (req, context) => {
  try {
    // Verificar permissão para exportação
    const authCheck = await requirePermission('reports:export')(req as any);
    if (authCheck) return authCheck;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'sessions'; // sessions, tickets, consensus
    const period = searchParams.get('period') || '30d';
    const projectId = searchParams.get('projectId');
    const teamId = searchParams.get('teamId');

    // Calcular datas baseadas no período
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Construir filtros base
    const baseFilter = {
      organizationId: context.organizationId,
      createdAt: {
        gte: startDate,
        lte: now
      }
    };

    let csvData = '';
    let filename = '';

    switch (type) {
      case 'sessions':
        csvData = await generateSessionsCSV(baseFilter, projectId, teamId);
        filename = `sessions-report-${period}-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      
      case 'tickets':
        csvData = await generateTicketsCSV(baseFilter, projectId, teamId);
        filename = `tickets-report-${period}-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      
      case 'consensus':
        csvData = await generateConsensusCSV(baseFilter, projectId, teamId);
        filename = `consensus-report-${period}-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      
      default:
        return NextResponse.json(
          { error: 'Tipo de relatório inválido' },
          { status: 400 }
        );
    }

    // Retornar arquivo CSV
    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Erro ao exportar relatório:', error);
    return NextResponse.json(
      { error: 'Erro interno ao exportar relatório' },
      { status: 500 }
    );
  }
});

async function generateSessionsCSV(baseFilter: any, projectId?: string | null, teamId?: string | null) {
  const sessionFilter: any = { ...baseFilter };
  
  if (projectId) {
    sessionFilter.projectId = projectId;
  }
  
  if (teamId) {
    sessionFilter.project = {
      teams: {
        some: {
          id: teamId
        }
      }
    };
  }

  const sessions = await prisma.session.findMany({
    where: sessionFilter,
    include: {
      createdBy: {
        select: { name: true, email: true }
      },
      project: {
        select: { name: true }
      },
      _count: {
        select: {
          participants: true,
          tickets: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Cabeçalho CSV
  const headers = [
    'ID da Sessão',
    'Nome',
    'Descrição',
    'Status',
    'Modo de Votação',
    'Criado por',
    'Projeto',
    'Participantes',
    'Tickets',
    'Data de Criação',
    'Última Atualização'
  ];

  // Dados CSV
  const rows = sessions.map(session => [
    session.id,
    `"${session.name}"`,
    `"${session.description || ''}"`,
    session.status,
    session.votingMode,
    `"${session.createdBy.name}"`,
    `"${session.project?.name || ''}"`,
    session._count.participants,
    session._count.tickets,
    session.createdAt.toISOString(),
    session.updatedAt.toISOString()
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

async function generateTicketsCSV(baseFilter: any, projectId?: string | null, teamId?: string | null) {
  const ticketFilter: any = {
    session: {
      organizationId: baseFilter.organizationId,
      createdAt: {
        gte: baseFilter.createdAt.gte,
        lte: baseFilter.createdAt.lte
      }
    }
  };
  
  if (projectId) {
    ticketFilter.session.projectId = projectId;
  }
  
  if (teamId) {
    ticketFilter.session.project = {
      teams: {
        some: {
          id: teamId
        }
      }
    };
  }

  const tickets = await prisma.ticket.findMany({
    where: ticketFilter,
    include: {
      session: {
        select: {
          name: true,
          votingMode: true,
          createdBy: {
            select: { name: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Cabeçalho CSV
  const headers = [
    'ID do Ticket',
    'Título',
    'Descrição',
    'Status',
    'Prioridade',
    'Sessão',
    'Modo de Votação',
    'Voto Médio',
    'Estimativa Final',
    'Criado por',
    'Data de Criação',
    'Última Atualização'
  ];

  // Dados CSV
  const rows = tickets.map(ticket => [
    ticket.id,
    `"${ticket.title}"`,
    `"${ticket.description || ''}"`,
    ticket.status,
    ticket.priority,
    `"${ticket.session.name}"`,
    ticket.session.votingMode,
    ticket.averageVote || '',
    ticket.finalEstimate || '',
    `"${ticket.session.createdBy.name}"`,
    ticket.createdAt.toISOString(),
    ticket.updatedAt.toISOString()
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

async function generateConsensusCSV(baseFilter: any, projectId?: string | null, teamId?: string | null) {
  const sessionFilter: any = {
    organizationId: baseFilter.organizationId,
    createdAt: {
      gte: baseFilter.createdAt.gte,
      lte: baseFilter.createdAt.lte
    },
    tickets: {
      some: {
        finalEstimate: { not: null }
      }
    }
  };
  
  if (projectId) {
    sessionFilter.projectId = projectId;
  }
  
  if (teamId) {
    sessionFilter.project = {
      teams: {
        some: {
          id: teamId
        }
      }
    };
  }

  const sessions = await prisma.session.findMany({
    where: sessionFilter,
    include: {
      tickets: {
        where: {
          finalEstimate: { not: null }
        },
        select: {
          title: true,
          finalEstimate: true,
          averageVote: true,
          createdAt: true,
          updatedAt: true
        }
      },
      _count: {
        select: {
          participants: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Cabeçalho CSV
  const headers = [
    'Sessão',
    'Ticket',
    'Voto Médio',
    'Estimativa Final',
    'Diferença (%)',
    'Consenso (%)',
    'Participantes',
    'Data da Votação'
  ];

  // Dados CSV
  const rows: string[][] = [];

  sessions.forEach(session => {
    session.tickets.forEach(ticket => {
      const average = ticket.averageVote;
      const final = parseFloat(ticket.finalEstimate!);
      
      if (average && !isNaN(final)) {
        const difference = Math.abs(final - average) / average;
        const consensus = Math.max(0, 1 - difference);
        
        rows.push([
          `"${session.name}"`,
          `"${ticket.title}"`,
          average.toString(),
          final.toString(),
          (difference * 100).toFixed(2),
          (consensus * 100).toFixed(2),
          session._count.participants.toString(),
          ticket.updatedAt.toISOString()
        ]);
      }
    });
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}
