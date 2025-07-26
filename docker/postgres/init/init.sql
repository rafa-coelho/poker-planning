-- Script de inicialização do PostgreSQL para Poker Planning
-- Este script é executado automaticamente quando o container é criado pela primeira vez

-- Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Configurações de timezone
SET timezone = 'America/Sao_Paulo';

-- Configurações de performance para desenvolvimento
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;

-- Criar índices adicionais que podem ser úteis
-- (Serão criados automaticamente quando o Prisma rodar as migrations)

-- Log de inicialização
DO $$
BEGIN
    RAISE NOTICE 'Poker Planning PostgreSQL database initialized successfully!';
    RAISE NOTICE 'Database: poker_planning';
    RAISE NOTICE 'User: poker_user';
    RAISE NOTICE 'Timezone: %', current_setting('timezone');
END $$; 