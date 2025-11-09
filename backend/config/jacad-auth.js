const axios = require('axios')
const { runRedisCommand } = require('./redis-client')

// Chave para salvar o token no Redis
const TOKEN_KEY = 'jacad_token'

class JacadAuth {
  constructor() {
    this.baseURL = process.env.JACAD_BASE_URL
    this.apiKey = process.env.JACAD_ACCESS_TOKEN
    this.authPromise = null // Lock para evitar autenticações simultâneas

    if (!this.apiKey) {
      console.error('❌ ERRO FATAL: JACAD_ACCESS_TOKEN não definida!')
      process.exit(1)
    }
  }

  async authenticate() {
    console.log('🔐 Autenticando com JACAD API...')
    try {
      const response = await axios.post(`${this.baseURL}/auth/token`, {}, {
        headers: {
          'token': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })

      if (response.data && response.data.token) {
        const token = response.data.token
        const expiryDate = new Date(response.data.expiresIn)
        
        // Calcula 5 minutos antes de expirar
        const expiresInSeconds = Math.floor((expiryDate.getTime() - Date.now()) / 1000) - 300
        
        if (expiresInSeconds <= 0) {
          throw new Error('Token recebido da API já está expirado ou muito próximo de expirar.')
        }

        // Salva o token no Redis com expiração
        await runRedisCommand(async (client) => {
          await client.set(TOKEN_KEY, token, { EX: expiresInSeconds })
        });

        console.log('✅ Autenticação bem-sucedida e salva no Redis!')
        return token
      }
      
      throw new Error('Token não recebido na resposta')

    } catch (error) {
      console.error('❌ Erro na autenticação:', error.message)
      throw new Error('Falha na autenticação com JACAD (Verifique o Token).')
    }
  }

  async getValidToken() {
    //tenta pegar o token do Redis
    const token = await runRedisCommand(async (client) => {
      return await client.get(TOKEN_KEY)
    });

    if (token) {
      // console.log('✅ Token recuperado do Redis')
      return token
    }

    // Se não houver token válido, inicia o processo de autenticação
    if (!this.authPromise) {
      console.log('⏳ Token expirado/inexistente. Iniciando autenticação...')
      this.authPromise = this.authenticate().finally(() => {
        this.authPromise = null // Limpa a promise após resolver
      })
    } else {
      console.log('⌛ Aguardando autenticação em progresso...')
    }

    // Aguarda a autenticação e retorna o token obtido, seja de uma nova chamada ou da promise existente.
    return await this.authPromise
  }
}

module.exports = new JacadAuth()