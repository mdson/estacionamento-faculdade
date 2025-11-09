const axios = require('axios')
const jacadAuth = require('./jacad-auth')
const rateLimiter = require('../middleware/rateLimit')

class JacadAPI {
  constructor() {
    this.baseURL = 'https://fsh-developer.jacad.com.br/api/v1'
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 15000 // 15 segundos timeout
    })
  }

  async makeRequest(config, ip = 'unknown') {
    // --- MUDANÇA AQUI: Adicionado 'await' ---
    const techLimit = await rateLimiter.checkTechnicalLimit(ip)
    if (!techLimit.allowed) {
      throw new Error(`Rate limit técnico excedido. Tente novamente em ${techLimit.retryAfter} segundos`)
    }

    // --- MUDANÇA AQUI: Adicionado 'await' ---
    const businessLimit = await rateLimiter.checkBusinessLimit()
    if (!businessLimit.allowed) {
      throw new Error(`Rate limit de negócio excedido. Tente novamente em ${businessLimit.retryAfter} segundos`)
    }

    // Obtém token válido (já era async)
    const token = await jacadAuth.getValidToken()
    
    const requestConfig = {
      ...config,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...config.headers
      }
    }

    try {
      console.log(`🌐 Fazendo requisição para: ${config.url}`)
      const response = await this.client(requestConfig)
      return response.data
    } catch (error) {
      console.error('❌ Erro na requisição JACAD:', {
        url: config.url,
        status: error.response?.status,
        message: error.message
      })

      // Se for erro de autenticação, tenta renovar o token uma vez
      if (error.response?.status === 401) {
        console.log('🔄 Token inválido, tentando reautenticar (forçando)...')
        // Força a autenticação, limpando o "lock" se houver
        jacadAuth.authPromise = null
        const newToken = await jacadAuth.authenticate()
        
        // Tenta novamente com novo token
        requestConfig.headers.Authorization = `Bearer ${newToken}`
        const retryResponse = await this.client(requestConfig)
        return retryResponse.data
      }

      throw error
    }
  }

  async searchStudents(searchTerm, ip) {
    try {
      console.log(`🔍 Buscando alunos com termo: ${searchTerm}`)

      const data = await this.makeRequest({
        method: 'GET',
        url: '/controle-acesso/matriculas-entrada-saida',
        params: {
          pageSize: 500, 
          descricao: searchTerm 
        }
      }, ip)

      console.log('📊 Resposta da API:', JSON.stringify(data, null, 2))

      if (data.elements && data.elements.length > 0) {
        
        const students = data.elements.map(student => {
          return {
            active: true, // Endpoint só retorna matrículas ATIVAS
            name: student.nome || 'Nome não disponível',
            ra: student.ra || 'RA indisponível',
            course: student.cursoBase || 'Curso não disponível',
            turma: student.turma || 'Turma não disponível'
          }
        })
        
        console.log(`✅ ${students.length} aluno(s) encontrado(s)`)
        return students
      }

      console.log('❌ Nenhum aluno encontrado na API')
      return []

    } catch (error) {
      console.error('❌ Erro na API JACAD:', error.message)
      throw new Error(`Falha na comunicação com o sistema: ${error.message}`)
    }
  }
}

module.exports = new JacadAPI()