const express = require('express')
const router = express.Router()
const jacadAPI = require('../config/jacad-api')
const rateLimiter = require('../middleware/rateLimit')
const jacadAuth = require('../config/jacad-auth')

// Middleware para obter IP do cliente
const getClientIP = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         'unknown'
}

// POST /api/verify-student
router.post('/verify-student', async (req, res) => {
  const clientIP = getClientIP(req)
  
  try {
    const { searchTerm } = req.body

    // --- VALIDAÇÃO ---
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length === 0) {
      console.log('❌ Termo de busca inválido ou não fornecido')
      return res.status(400).json({
        success: false,
        message: 'RA ou Nome do aluno é obrigatório'
      })
    }
    
    const sanitizedTerm = searchTerm.trim().substring(0, 100); // Limita a 100 caracteres
    // --- FIM VALIDAÇÃO ---
    
    console.log(`📨 Requisição de ${clientIP} para verificar termo: ${sanitizedTerm}`)

    const studentsList = await jacadAPI.searchStudents(sanitizedTerm, clientIP)

    console.log(`✅ Retornando ${studentsList.length} resultado(s)`)
    return res.json({
      success: true,
      data: studentsList
    })

  } catch (error) {
    console.error(`💥 Erro para ${clientIP}:`, error.message)
    
    // Não envia a mensagem de erro interna para o cliente
    let clientMessage = 'Não foi possível verificar o aluno. Tente novamente.'
    if (error.message.includes('Rate limit')) {
      clientMessage = 'Muitas requisições. Tente novamente em alguns segundos.'
    }

    return res.status(500).json({
      success: false,
      message: clientMessage
    })
  }
})

// --- ROTA /status ATUALIZADA ---
router.get('/status', async (req, res) => {
  const clientIP = getClientIP(req)
  
  // Tornadas 'async' para funcionar com Redis
  const techLimit = await rateLimiter.checkTechnicalLimit(clientIP)
  const businessLimit = await rateLimiter.checkBusinessLimit()
  const token = await jacadAuth.getValidToken()
  
  res.json({
    success: true,
    data: {
      technicalLimit: {
        allowed: techLimit.allowed,
        remaining: techLimit.remaining
      },
      businessLimit: {
        allowed: businessLimit.allowed,
        remaining: businessLimit.remaining
      },
      authentication: {
        authenticated: token !== null,
      }
    }
  })
})

module.exports = router