const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testTickets() {
  console.log('🧪 Testando funcionalidade de tickets...\n');

  try {
    // 1. Testar login
    console.log('1. Fazendo login...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'password123',
      }),
    });

    if (!loginResponse.ok) {
      throw new Error('Login falhou');
    }

    const loginData = await loginResponse.json();
    const token = loginData.data.accessToken;
    const organizationId = loginData.data.user.organizationId;

    console.log('✅ Login realizado com sucesso');

    // 2. Criar uma sessão
    console.log('\n2. Criando sessão...');
    const sessionResponse = await fetch(`${BASE_URL}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-organization-id': organizationId,
      },
      body: JSON.stringify({
        name: 'Sessão de Teste - Tickets',
        description: 'Sessão para testar funcionalidade de tickets',
      }),
    });

    if (!sessionResponse.ok) {
      throw new Error('Criação de sessão falhou');
    }

    const sessionData = await sessionResponse.json();
    const sessionId = sessionData.data.id;

    console.log('✅ Sessão criada:', sessionId);

    // 3. Criar tickets
    console.log('\n3. Criando tickets...');
    const tickets = [
      {
        title: 'Implementar login',
        description: 'Criar sistema de autenticação',
        priority: 'HIGH',
      },
      {
        title: 'Criar dashboard',
        description: 'Interface principal do sistema',
        priority: 'MEDIUM',
      },
      {
        title: 'Configurar banco de dados',
        description: 'Setup inicial do PostgreSQL',
        priority: 'URGENT',
      },
    ];

    const createdTickets = [];
    for (const ticket of tickets) {
      const ticketResponse = await fetch(`${BASE_URL}/api/sessions/${sessionId}/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-organization-id': organizationId,
        },
        body: JSON.stringify(ticket),
      });

      if (ticketResponse.ok) {
        const ticketData = await ticketResponse.json();
        createdTickets.push(ticketData.data);
        console.log(`✅ Ticket criado: ${ticket.title}`);
      } else {
        console.log(`❌ Erro ao criar ticket: ${ticket.title}`);
      }
    }

    // 4. Listar tickets
    console.log('\n4. Listando tickets...');
    const listResponse = await fetch(`${BASE_URL}/api/sessions/${sessionId}/tickets`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-organization-id': organizationId,
      },
    });

    if (listResponse.ok) {
      const listData = await listResponse.json();
      console.log(`✅ ${listData.data.length} tickets encontrados`);
      listData.data.forEach((ticket, index) => {
        console.log(`   ${index + 1}. ${ticket.title} (${ticket.status})`);
      });
    }

    // 5. Testar atualização de ticket
    if (createdTickets.length > 0) {
      console.log('\n5. Testando atualização de ticket...');
      const firstTicket = createdTickets[0];
      
      const updateResponse = await fetch(`${BASE_URL}/api/tickets/${firstTicket.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-organization-id': organizationId,
        },
        body: JSON.stringify({
          status: 'VOTING',
        }),
      });

      if (updateResponse.ok) {
        console.log('✅ Ticket atualizado para status VOTING');
      } else {
        console.log('❌ Erro ao atualizar ticket');
      }
    }

    console.log('\n🎉 Testes concluídos com sucesso!');
    console.log(`📋 Sessão criada: ${sessionId}`);
    console.log(`🎫 Tickets criados: ${createdTickets.length}`);

  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
  }
}

testTickets(); 