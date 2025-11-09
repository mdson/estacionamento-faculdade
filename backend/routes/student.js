const express = require('express')
const router = express.Router()
const jacadAPI = require('../config/jacad-api')

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

    console.log(`📨 Requisição de ${clientIP} para verificar termo: ${searchTerm}`)

    if (!searchTerm) {
      console.log('❌ Termo de busca não fornecido')
      return res.status(400).json({
        success: false,
        message: 'RA ou Nome do aluno é obrigatório'
      })
    }

    const studentsList = await jacadAPI.searchStudents(searchTerm, clientIP)

    console.log(`✅ Retornando ${studentsList.length} resultado(s)`)
    return res.json({
      success: true,
      data: studentsList // Envia a lista (array) de alunos
    })

  } catch (error) {
    console.error(`💥 Erro para ${clientIP}:`, error.message)
    
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

router.get('/status', (req, res) => {
  const clientIP = getClientIP(req)
  const techLimit = require('../middleware/rateLimit').checkTechnicalLimit(clientIP)
  const businessLimit = require('../middleware/rateLimit').checkBusinessLimit()
  
  res.json({
    success: true,
    data: {
      technicalLimit: {
        allowed: techLimit.allowed,
        remaining: techLimit.remaining,
        retryAfter: techLimit.retryAfter
      },
      businessLimit: {
        allowed: businessLimit.allowed,
        remaining: businessLimit.remaining,
        retryAfter: businessLimit.retryAfter
      },
      authentication: {
        authenticated: require('../config/jacad-auth').currentToken !== null,
        expires: require('../config/jacad-auth').tokenExpiry
      }
    }
  })
})

module.exports = router