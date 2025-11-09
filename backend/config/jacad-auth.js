const axios = require('axios')

class JacadAuth {
  constructor() {
    this.baseURL = process.env.JACAD_BASE_URL || 'https://fsh-developer.jacad.com.br/api/v1'

    this.apiKey = process.env.JACAD_ACCESS_TOKEN;
    if (!this.apiKey) {
       console.error('❌ ERRO FATAL: Variável de ambiente JACAD_ACCESS_TOKEN não definida!');
       process.exit(1);
    }
    
    this.currentToken = null
    this.tokenExpiry = null
    this.refreshTimeout = null
  }

  async authenticate() {
    if (!this.apiKey) {
         throw new Error('Falha na autenticação: JACAD_ACCESS_TOKEN não configurado.');
    }
    try {
      console.log('🔐 Autenticando com JACAD API...')
      
      const response = await axios.post(`${this.baseURL}/auth/token`, {}, {
        headers: {
          'token': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })

      console.log('🕵️‍♂️ DEBUG: Valor bruto de expiresIn recebido da API:', response.data.expiresIn);
      console.log('🕵️‍♂️ DEBUG: Tipo de expiresIn:', typeof response.data.expiresIn);

      if (response.data && response.data.token) {
        this.currentToken = response.data.token
        this.tokenExpiry = new Date(response.data.expiresIn)
        
        console.log('✅ Autenticação bem-sucedida!')
        console.log(`📅 Token expira em: ${this.tokenExpiry}`)
        
        // Agenda renovação automática (1 hora antes da expiração)
        this.scheduleTokenRefresh()
        return true
      }
      
      throw new Error('Token não recebido na resposta')
      
    } catch (error) {
      console.error('❌ Erro na autenticação:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })

      if (error.response?.status === 401 || error.response?.status === 403 || !this.apiKey) {
        throw new Error('Falha na autenticação com JACAD (Verifique o Token ou permissões)');
      } else {
         console.error('Erro temporário na autenticação, tentará novamente mais tarde.');
         return false; // Indica que a autenticação falhou, mas pode tentar de novo
      }

    }
  }

  scheduleTokenRefresh() {
    const expiryTime = this.tokenExpiry.getTime()
    const now = Date.now()
    const timeUntilExpiry = expiryTime - now
    
    // Renova 5 minutos antes da expiração
    const refreshTime = timeUntilExpiry - (5 * 60 * 1000)
    
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout)
    }

    if (refreshTime > 0) {
      this.refreshTimeout = setTimeout(() => {
        console.log('🔄 Renovando token automaticamente...')
        this.authenticate()
      }, refreshTime)
      
      console.log(`⏰ Token será renovado em ${Math.round(refreshTime / 60000)} minutos`)
    }
  }

  async getValidToken() {
    // Se não tem token ou expirou, autentica
    if (!this.currentToken || this.isTokenExpired()) {
      await this.authenticate()
    }
    return this.currentToken
  }

  isTokenExpired() {
    if (!this.tokenExpiry) return true
    // Considera expirado 5 minutos antes para ter margem de segurança
    return Date.now() >= this.tokenExpiry.getTime() - (5 * 60 * 1000) 
  }

  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.currentToken}`,
      'Content-Type': 'application/json'
    }
  }
}

module.exports = new JacadAuth()