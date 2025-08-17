#!/usr/bin/env node

/**
 * 🚀 Script de Análise de Bundle Size
 * Analisa o tamanho do bundle e identifica oportunidades de otimização
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Configurações
const BUNDLE_ANALYZER_CONFIG = {
  enabled: process.env.ANALYZE === 'true',
  outputDir: 'bundle-analysis',
  maxSize: 500 * 1024, // 500KB
  maxChunkSize: 200 * 1024, // 200KB
}

/**
 * Executa análise de bundle
 */
function analyzeBundle() {
  console.log('🔍 Iniciando análise de bundle...')
  
  try {
    // Verificar se o bundle analyzer está instalado
    try {
      require.resolve('@next/bundle-analyzer')
    } catch (e) {
      console.log('📦 Instalando @next/bundle-analyzer...')
      execSync('npm install --save-dev @next/bundle-analyzer', { stdio: 'inherit' })
    }

    // Criar diretório de análise
    if (!fs.existsSync(BUNDLE_ANALYZER_CONFIG.outputDir)) {
      fs.mkdirSync(BUNDLE_ANALYZER_CONFIG.outputDir, { recursive: true })
    }

    // Executar build com análise
    console.log('🏗️ Executando build com análise...')
    execSync('ANALYZE=true npm run build', { stdio: 'inherit' })

    console.log('✅ Análise de bundle concluída!')
    console.log(`📁 Relatórios salvos em: ${BUNDLE_ANALYZER_CONFIG.outputDir}`)
    
  } catch (error) {
    console.error('❌ Erro na análise de bundle:', error.message)
    process.exit(1)
  }
}

/**
 * Analisa dependências do package.json
 */
function analyzeDependencies() {
  console.log('📦 Analisando dependências...')
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    const { dependencies, devDependencies } = packageJson
    
    console.log('\n📊 Estatísticas de Dependências:')
    console.log(`Total de dependências: ${Object.keys(dependencies || {}).length}`)
    console.log(`Total de devDependencies: ${Object.keys(devDependencies || {}).length}`)
    
    // Identificar dependências grandes
    const largeDeps = [
      'react', 'react-dom', 'next', '@prisma/client',
      'chart.js', 'framer-motion', 'socket.io-client'
    ]
    
    console.log('\n🔍 Dependências que podem impactar o bundle:')
    largeDeps.forEach(dep => {
      if (dependencies?.[dep] || devDependencies?.[dep]) {
        console.log(`  - ${dep}`)
      }
    })
    
  } catch (error) {
    console.error('❌ Erro ao analisar dependências:', error.message)
  }
}

/**
 * Verifica tamanho de arquivos estáticos
 */
function analyzeStaticFiles() {
  console.log('📁 Analisando arquivos estáticos...')
  
  try {
    const publicDir = path.join(process.cwd(), 'public')
    const staticFiles = []
    
    function scanDirectory(dir, basePath = '') {
      const files = fs.readdirSync(dir)
      
      files.forEach(file => {
        const filePath = path.join(dir, file)
        const relativePath = path.join(basePath, file)
        const stat = fs.statSync(filePath)
        
        if (stat.isDirectory()) {
          scanDirectory(filePath, relativePath)
        } else {
          staticFiles.push({
            path: relativePath,
            size: stat.size,
            sizeKB: Math.round(stat.size / 1024)
          })
        }
      })
    }
    
    if (fs.existsSync(publicDir)) {
      scanDirectory(publicDir)
      
      console.log('\n📊 Arquivos Estáticos:')
      staticFiles
        .sort((a, b) => b.size - a.size)
        .slice(0, 10)
        .forEach(file => {
          console.log(`  ${file.path}: ${file.sizeKB}KB`)
        })
    }
    
  } catch (error) {
    console.error('❌ Erro ao analisar arquivos estáticos:', error.message)
  }
}

/**
 * Gera relatório de otimizações
 */
function generateOptimizationReport() {
  console.log('\n📋 Relatório de Otimizações Recomendadas:')
  
  const recommendations = [
    {
      category: 'Bundle Size',
      items: [
        'Implementar code splitting por rota',
        'Usar dynamic imports para componentes pesados',
        'Otimizar imports de bibliotecas (ex: lodash-es)',
        'Remover dependências não utilizadas'
      ]
    },
    {
      category: 'Images',
      items: [
        'Converter imagens para WebP/AVIF',
        'Implementar lazy loading de imagens',
        'Usar next/image para otimização automática',
        'Comprimir imagens existentes'
      ]
    },
    {
      category: 'Caching',
      items: [
        'Implementar Service Workers',
        'Configurar cache headers apropriados',
        'Usar CDN para assets estáticos',
        'Implementar cache de API responses'
      ]
    },
    {
      category: 'Database',
      items: [
        'Otimizar queries com índices',
        'Implementar cache de queries frequentes',
        'Usar paginação em listas grandes',
        'Monitorar queries lentas'
      ]
    }
  ]
  
  recommendations.forEach(category => {
    console.log(`\n${category.category}:`)
    category.items.forEach(item => {
      console.log(`  - ${item}`)
    })
  })
}

/**
 * Função principal
 */
function main() {
  console.log('🚀 Poker Planning - Análise de Performance')
  console.log('=' .repeat(50))
  
  // Verificar argumentos
  const args = process.argv.slice(2)
  const command = args[0]
  
  switch (command) {
    case 'bundle':
      analyzeBundle()
      break
    case 'deps':
      analyzeDependencies()
      break
    case 'static':
      analyzeStaticFiles()
      break
    case 'report':
      generateOptimizationReport()
      break
    case 'all':
      analyzeDependencies()
      analyzeStaticFiles()
      generateOptimizationReport()
      if (BUNDLE_ANALYZER_CONFIG.enabled) {
        analyzeBundle()
      }
      break
    default:
      console.log('📖 Uso: node scripts/analyze-bundle.js [comando]')
      console.log('\nComandos disponíveis:')
      console.log('  bundle  - Analisa tamanho do bundle')
      console.log('  deps    - Analisa dependências')
      console.log('  static  - Analisa arquivos estáticos')
      console.log('  report  - Gera relatório de otimizações')
      console.log('  all     - Executa todas as análises')
      console.log('\nExemplo: ANALYZE=true node scripts/analyze-bundle.js all')
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main()
}

module.exports = {
  analyzeBundle,
  analyzeDependencies,
  analyzeStaticFiles,
  generateOptimizationReport
} 