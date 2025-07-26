#!/bin/bash

# Setup de Desenvolvimento - Poker Planning Empresarial
# Este script automatiza a configuração inicial do ambiente de desenvolvimento

echo "🚀 Iniciando setup do ambiente de desenvolvimento..."

# Verificar se o Docker está instalado
echo "🐳 Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado"
    exit 1
fi
echo "✅ Docker está instalado"

# Verificar se o Docker está rodando
if ! docker ps &> /dev/null; then
    echo "❌ Docker Engine não está rodando. Inicie o Docker primeiro!"
    exit 1
fi
echo "✅ Docker Engine está rodando"

# Criar arquivo .env se não existir
if [ ! -f ".env" ]; then
    echo "📄 Criando arquivo .env..."
    cat > .env << EOF
# Database
DATABASE_URL="postgresql://poker_user:poker_password@localhost:5432/poker_planning?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"

# App Config
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-change-in-production"

# Socket.io
SOCKET_PORT=3001

# Development
NODE_ENV="development"
EOF
    echo "✅ Arquivo .env criado"
else
    echo "✅ Arquivo .env já existe"
fi

# Iniciar PostgreSQL via Docker
echo "🗄️ Iniciando PostgreSQL..."
docker-compose up -d postgres

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL iniciado com sucesso"
else
    echo "❌ Erro ao iniciar PostgreSQL"
    exit 1
fi

# Aguardar PostgreSQL estar pronto
echo "⏳ Aguardando PostgreSQL estar pronto..."
sleep 5

# Executar primeira migration
echo "📊 Executando primeira migration..."
npx prisma migrate dev --name init

if [ $? -eq 0 ]; then
    echo "✅ Migration executada com sucesso"
else
    echo "❌ Erro na migration"
    exit 1
fi

# Gerar Prisma Client
echo "🔧 Gerando Prisma Client..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma Client gerado com sucesso"
else
    echo "❌ Erro ao gerar Prisma Client"
    exit 1
fi

echo ""
echo "🎉 Setup completo! Próximos passos:"
echo "   • Execute 'npx prisma studio' para ver o banco de dados"
echo "   • Execute 'npm run dev' para iniciar o servidor"  
echo "   • Acesse http://localhost:5050 para o pgAdmin (admin@poker-planning.local / admin123)"
echo "" 