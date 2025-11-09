const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
app.set('trust proxy', 1) // Confia no primeiro proxy
const PORT = process.env.PORT || 5000

// Middleware
const allowedOrigins = [
  'https://meu-site-fsh.com.br', 
  'https://www.meu-site-fsh.com.br'
];

// Permitir localhost em ambiente de desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000');
}

const corsOptions = {
  origin: function (origin, callback) {
    
    // Verifica se a origem da requisição está na nossa lista
    const isAllowed = allowedOrigins.includes(origin);

    if (!origin || isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Acesso não permitido por CORS'));
    }
  }
};

app.use(cors(corsOptions));
app.use(express.json())

// Log de todas as requisições
app.use((req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress
  console.log(`${new Date().toISOString()} - ${clientIP} - ${req.method} ${req.path}`)
  next()
})

// Inicializa autenticação ao iniciar o servidor
async function initializeServer() {
  try {
    const jacadAuth = require('./config/jacad-auth')
    await jacadAuth.authenticate()
    
    console.log('✅ Servidor inicializado com autenticação JACAD')
    
    // Routes
    app.use('/api', require('./routes/student'))

    // Health check
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Controle Estacionamento FSH',
        authenticated: jacadAuth.currentToken !== null
      })
    })

    // Error handling
    app.use((err, req, res, next) => {
      console.error('💥 Erro não tratado:', err)
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      })
    })

    app.listen(PORT, () => {
      console.log('🚀 ========================================')
      console.log('🚀 Servidor Controle Estacionamento FSH')
      console.log(`🚀 Porta: ${PORT}`)
      console.log(`🚀 Token: ${jacadAuth.currentToken ? '✅ Válido' : '❌ Inválido'}`)
      console.log('🚀 ========================================')
    })

  } catch (error) {
    console.error('❌ Falha na inicialização do servidor:', error.message)
    process.exit(1)
  }
}

initializeServer()