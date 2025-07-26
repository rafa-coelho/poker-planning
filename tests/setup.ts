// Configurações globais para testes
// Aumentar timeout para testes de API
jest.setTimeout(10000)

// Configurar fetch global
const nodeFetch = require('node-fetch')
global.fetch = nodeFetch 