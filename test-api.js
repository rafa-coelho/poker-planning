const fetch = require('node-fetch');

async function testAPIs() {
  const baseURL = 'http://localhost:3000/api';
  
  console.log('🧪 Testando APIs...\n');
  
  // Teste 1: Login com usuário existente
  console.log('1. Testando login com usuário existente...');
  try {
    const loginResponse = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@nyxlab.com',
        password: 'Admin123!@'
      }),
    });
    
    const loginData = await loginResponse.json();
    console.log('Status:', loginResponse.status);
    console.log('Response:', JSON.stringify(loginData, null, 2));
  } catch (error) {
    console.log('Erro no login:', error.message);
  }
  
  console.log('\n2. Testando registro de novo usuário...');
  try {
    const registerResponse = await fetch(`${baseURL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'MySecurePass123!',
        organizationName: 'Test Organization'
      }),
    });
    
    const registerData = await registerResponse.json();
    console.log('Status:', registerResponse.status);
    console.log('Response:', JSON.stringify(registerData, null, 2));
  } catch (error) {
    console.log('Erro no registro:', error.message);
  }
}

testAPIs();