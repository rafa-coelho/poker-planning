# Setup de Desenvolvimento - Poker Planning Empresarial
# Este script automatiza a configuração inicial do ambiente de desenvolvimento

Write-Host "🚀 Iniciando setup do ambiente de desenvolvimento..." -ForegroundColor Green

# Verificar se o Docker está rodando
Write-Host "🐳 Verificando Docker..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "✅ Docker está instalado" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker não está instalado ou disponível" -ForegroundColor Red
    exit 1
}

# Verificar se o Docker está rodando
try {
    docker ps | Out-Null
    Write-Host "✅ Docker Engine está rodando" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Engine não está rodando. Inicie o Docker Desktop primeiro!" -ForegroundColor Red
    Write-Host "   Aguardando Docker Desktop iniciar..." -ForegroundColor Yellow
    Read-Host "   Pressione Enter após iniciar o Docker Desktop"
}

# Criar arquivo .env se não existir
if (-not (Test-Path ".env")) {
    Write-Host "📄 Criando arquivo .env..." -ForegroundColor Yellow
    @"
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
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Arquivo .env criado" -ForegroundColor Green
} else {
    Write-Host "✅ Arquivo .env já existe" -ForegroundColor Green
}

# Iniciar PostgreSQL via Docker
Write-Host "🗄️ Iniciando PostgreSQL..." -ForegroundColor Yellow
docker-compose up -d postgres

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ PostgreSQL iniciado com sucesso" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao iniciar PostgreSQL" -ForegroundColor Red
    exit 1
}

# Aguardar PostgreSQL estar pronto
Write-Host "⏳ Aguardando PostgreSQL estar pronto..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Executar primeira migration
Write-Host "📊 Executando primeira migration..." -ForegroundColor Yellow
npx prisma migrate dev --name init

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration executada com sucesso" -ForegroundColor Green
} else {
    Write-Host "❌ Erro na migration" -ForegroundColor Red
    exit 1
}

# Gerar Prisma Client
Write-Host "🔧 Gerando Prisma Client..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma Client gerado com sucesso" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao gerar Prisma Client" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Setup completo! Próximos passos:" -ForegroundColor Green
Write-Host "   • Execute 'npx prisma studio' para ver o banco de dados" -ForegroundColor Cyan
Write-Host "   • Execute 'npm run dev' para iniciar o servidor" -ForegroundColor Cyan
Write-Host "   • Acesse http://localhost:5050 para o pgAdmin (admin@poker-planning.local / admin123)" -ForegroundColor Cyan
Write-Host "" 