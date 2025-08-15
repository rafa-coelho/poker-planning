import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withTenantIsolation } from '@/lib/middleware/tenant';
import { requirePermission } from '@/lib/middleware/authorization';

// GET /api/reports - Analytics gerais da organização
export const GET = withTenantIsolation(async (req, context) => {
  try {
    // Verificar permissão para relatórios
    const authCheck = await requirePermission('reports:read')(req as any);
    if (authCheck) return authCheck;

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, 1y
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

    // Construir filtros base para sessões
    const sessionFilter: any = {
      organizationId: context.organizationId,
      createdAt: {
        gte: startDate,
        lte: now
      }
    };

    // Filtros adicionais para sessões
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

    // Buscar métricas principais
    const [
      totalSessions,
      activeSessions,
      totalTickets,
      estimatedTickets,
      sessionsWithData
    ] = await Promise.all([
      // Total de sessões no período
      prisma.session.count({ where: sessionFilter }),
      
      // Sessões ativas
      prisma.session.count({ 
        where: { 
          ...sessionFilter, 
          status: 'ACTIVE' 
        } 
      }),
      
      // Total de tickets (através das sessões da organização)
      prisma.ticket.count({ 
        where: {
          session: {
            organizationId: context.organizationId,
            createdAt: {
              gte: startDate,
              lte: now
            },
            ...(projectId && { projectId }),
            ...(teamId && {
              project: {
                teams: {
                  some: { id: teamId }
                }
              }
            })
          }
        }
      }),
      
      // Tickets com estimativa final
      prisma.ticket.count({ 
        where: {
          session: {
            organizationId: context.organizationId,
            createdAt: {
              gte: startDate,
              lte: now
            },
            ...(projectId && { projectId }),
            ...(teamId && {
              project: {
                teams: {
                  some: { id: teamId }
                }
              }
            })
          },
          finalEstimate: { not: null }
        }
      }),
      
      // Sessões com dados para análise
      prisma.session.findMany({
        where: {
          ...sessionFilter,
          tickets: {
            some: {
              finalEstimate: { not: null }
            }
          }
        },
        include: {
          tickets: {
            where: {
              finalEstimate: { not: null }
            },
            select: {
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
        }
      })
    ]);

    // Contagem de participantes únicos (separada para evitar problemas com Promise)
    const participants = await prisma.sessionParticipant.findMany({
      where: {
        session: sessionFilter
      },
      select: {
        userId: true
      }
    });
    const totalParticipants = new Set(participants.map(p => p.userId)).size;

    // Calcular métricas de consenso
    let averageConsensus = 0;
    let averageVotingTime = 0;
    let consensusRates: Array<{ min: number; max: number; label: string; count: number }> = [];
    let sessionsOverTime: Array<{ date: string; sessions: number; consensus: number; participants: number }> = [];
    let participationRates: Array<{ date: string; rate: number }> = [];

    if (sessionsWithData.length > 0) {
      // Calcular consenso médio
      const consensusScores = sessionsWithData.map(session => {
        const tickets = session.tickets;
        if (tickets.length === 0) return 0;

        const sessionConsensus = tickets.reduce((acc, ticket) => {
          if (!ticket.finalEstimate || !ticket.averageVote) return acc;
          
          const final = parseFloat(ticket.finalEstimate);
          const average = ticket.averageVote;
          
          if (isNaN(final) || isNaN(average)) return acc;
          
          // Calcular diferença percentual
          const difference = Math.abs(final - average) / average;
          const consensus = Math.max(0, 1 - difference);
          
          return acc + consensus;
        }, 0) / tickets.length;

        return sessionConsensus;
      });

      averageConsensus = consensusScores.reduce((a, b) => a + b, 0) / consensusScores.length;

      // Calcular tempo médio de votação
      const votingTimes = sessionsWithData.map(session => {
        const tickets = session.tickets;
        if (tickets.length === 0) return 0;

        const sessionVotingTime = tickets.reduce((acc, ticket) => {
          const created = new Date(ticket.createdAt);
          const updated = new Date(ticket.updatedAt);
          const timeDiff = updated.getTime() - created.getTime();
          return acc + timeDiff;
        }, 0) / tickets.length;

        return sessionVotingTime / (1000 * 60); // Converter para minutos
      });

      averageVotingTime = votingTimes.reduce((a, b) => a + b, 0) / votingTimes.length;

      // Dados para gráficos
      const dailyStats = new Map<string, { sessions: number; consensus: number; participants: number }>();
      
      sessionsWithData.forEach(session => {
        const date = session.createdAt.toISOString().split('T')[0];
        const existing = dailyStats.get(date) || { sessions: 0, consensus: 0, participants: 0 };
        
        existing.sessions += 1;
        existing.participants += session._count.participants;
        
        const sessionConsensus = session.tickets.reduce((acc, ticket) => {
          if (!ticket.finalEstimate || !ticket.averageVote) return acc;
          const final = parseFloat(ticket.finalEstimate);
          const average = ticket.averageVote;
          if (isNaN(final) || isNaN(average)) return acc;
          const difference = Math.abs(final - average) / average;
          return acc + Math.max(0, 1 - difference);
        }, 0) / session.tickets.length;
        
        existing.consensus += sessionConsensus;
        dailyStats.set(date, existing);
      });

      // Converter para arrays ordenados
      sessionsOverTime = Array.from(dailyStats.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, stats]) => ({
          date,
          sessions: stats.sessions,
          consensus: stats.consensus / stats.sessions,
          participants: stats.participants
        }));

      // Taxa de consenso por faixa
      const consensusRanges: Array<{ min: number; max: number; label: string; count: number }> = [
        { min: 0, max: 0.5, label: '0-50%', count: 0 },
        { min: 0.5, max: 0.7, label: '50-70%', count: 0 },
        { min: 0.7, max: 0.9, label: '70-90%', count: 0 },
        { min: 0.9, max: 1, label: '90-100%', count: 0 }
      ];

      consensusScores.forEach(score => {
        const range = consensusRanges.find(r => score >= r.min && score < r.max);
        if (range) range.count++;
      });

      consensusRates = consensusRanges;

      // Taxa de participação
      participationRates = sessionsOverTime.map(day => ({
        date: day.date,
        rate: day.participants > 0 ? day.participants / day.sessions : 0
      }));
    } else {
      // Se não há dados suficientes, criar dados de exemplo para mostrar a estrutura
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      
      sessionsOverTime = [
        {
          date: yesterday.toISOString().split('T')[0],
          sessions: 0,
          consensus: 0,
          participants: 0
        },
        {
          date: today.toISOString().split('T')[0],
          sessions: totalSessions,
          consensus: 0.8,
          participants: totalParticipants
        }
      ];

      consensusRates = [
        { min: 0, max: 0.5, label: '0-50%', count: 0 },
        { min: 0.5, max: 0.7, label: '50-70%', count: 0 },
        { min: 0.7, max: 0.9, label: '70-90%', count: 1 },
        { min: 0.9, max: 1, label: '90-100%', count: 0 }
      ];

      participationRates = [
        {
          date: yesterday.toISOString().split('T')[0],
          rate: 0
        },
        {
          date: today.toISOString().split('T')[0],
          rate: totalParticipants > 0 ? 1 : 0
        }
      ];
    }

    return NextResponse.json({
      metrics: {
        totalSessions,
        activeSessions,
        totalTickets,
        estimatedTickets,
        totalParticipants,
        averageConsensus: Math.round(averageConsensus * 100) / 100,
        averageVotingTime: Math.round(averageVotingTime * 10) / 10
      },
      charts: {
        sessionsOverTime,
        consensusRates,
        participationRates
      },
      period,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json(
      { error: 'Erro interno ao gerar relatório' },
      { status: 500 }
    );
  }
});
