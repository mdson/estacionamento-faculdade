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
    // Verifica rate limits
    const techLimit = rateLimiter.checkTechnicalLimit(ip)
    if (!techLimit.allowed) {
      throw new Error(`Rate limit técnico excedido. Tente novamente em ${techLimit.retryAfter} segundos`)
    }

    const businessLimit = rateLimiter.checkBusinessLimit()
    if (!businessLimit.allowed) {
      throw new Error(`Rate limit de negócio excedido. Tente novamente em ${businessLimit.retryAfter} segundos`)
    }

    // Obtém token válido
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
        console.log('🔄 Token inválido, tentando reautenticar...')
        await jacadAuth.authenticate()
        
        // Tenta novamente com novo token
        requestConfig.headers.Authorization = `Bearer ${jacadAuth.currentToken}`
        const retryResponse = await this.client(requestConfig)
        return retryResponse.data
      }

      throw error
    }
  }

  // --- ALTERAÇÃO AQUI ---
  // A função agora se chama 'searchStudents' (plural)
  // e aceita um 'searchTerm' genérico (RA ou nome)
  async searchStudents(searchTerm, ip) {
    try {
      console.log(`🔍 Buscando alunos com termo: ${searchTerm}`)

      const data = await this.makeRequest({
        method: 'GET',
        url: '/controle-acesso/matriculas-entrada-saida',
        params: {
          pageSize: 500, // Busca uma página grande
          descricao: searchTerm // Usa o termo de busca no filtro 'descricao'
        }
      }, ip)

      console.log('📊 Resposta da API:', JSON.stringify(data, null, 2))

      // Se 'elements' existir e não estiver vazio, mapeia os resultados
      if (data.elements && data.elements.length > 0) {
        
        // --- ALTERAÇÃO AQUI ---
        // Usamos .map() para transformar a lista da API
        // em uma lista padronizada para o nosso frontend.
        const students = data.elements.map(student => {
          // A API do JACAD retorna matrícula 'ATIVA' ou 'INATIVA'
          // Vamos assumir que se ela retornou, é porque existe.
          // O endpoint "matriculas-entrada-saida" só retorna matrículas ATIVAS.
          return {
            active: true, // Se está na lista, está ativa
            name: student.nome || 'Nome não disponível',
            ra: student.ra || 'RA indisponível',
            course: student.cursoBase || 'Curso não disponível',
            turma: student.turma || 'Turma não disponível'
          }
        })
        
        console.log(`✅ ${students.length} aluno(s) encontrado(s)`)
        return students // Retorna a LISTA de alunos
      }

      console.log('❌ Nenhum aluno encontrado na API')
      return [] // Retorna uma lista vazia se não houver resultados

    } catch (error) {
      console.error('❌ Erro na API JACAD:', error.message)
      throw new Error(`Falha na comunicação com o sistema: ${error.message}`)
    }
  }
  // A função searchInCatraca não é mais necessária se 'matriculas-entrada-saida'
  // já filtra por ativos, mas pode ser mantida como fallback se desejar.
  // Por simplicidade, ela foi removida desta lógica principal.
}

module.exports = new JacadAPI()