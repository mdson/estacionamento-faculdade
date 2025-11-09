const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
app.set('trust proxy', 1) // Confia no primeiro proxy (essencial para req.ip)
const PORT = process.env.PORT || 5000

const allowedOrigins = [
  'https://estacionamento-faculdade.vercel.app',
  'https://estacionamento-faculdade-git-main-mdsons-projects.vercel.app',
  'https://estacionamento-faculdade-lglo8vsvc-mdsons-projects.vercel.app' // URL oficial do frontend
];

// Permitir localhost em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000');
}

const corsOptions = {
  origin: function (origin, callback) {
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

// Health check
app.get('/health', async (req, res) => {
  const jacadAuth = require('./config/jacad-auth')
  const token = await jacadAuth.getValidToken() // Tenta pegar o token
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Controle Estacionamento FSH',
    authenticated: token !== null
  })
})

// Rotas da API
app.use('/api', require('./routes/student'))

// Tratamento global de erros
app.use((err, req, res, next) => {
  console.error('💥 Erro não tratado:', err)
  res.status(500).json({ 
    success: false, 
    message: 'Erro interno do servidor' 
  })
})

// Inicia o servidor
app.listen(PORT, () => {
  console.log('🚀 ========================================')
  console.log('🚀 Servidor Controle Estacionamento FSH')
  console.log(`🚀 Porta: ${PORT}`)
  console.log(`🚀 Modo: ${process.env.NODE_ENV || 'não definido'}`)
  console.log('🚀 ========================================')
})