class RateLimiter {
  constructor() {
    // Rate Limit Técnico: 10 requests por segundo por IP
    this.technicalLimits = new Map()
    
    // Rate Limit de Negócio: 1000 requests por hora global
    this.businessTokens = 1000
    this.businessLastRefill = Date.now()
    this.businessRefillRate = 1000 / (60 * 60) // tokens por milissegundo
  }

  checkTechnicalLimit(ip) {
    const now = Date.now()
    const windowStart = now - 1000 // Janela de 1 segundo
    
    if (!this.technicalLimits.has(ip)) {
      this.technicalLimits.set(ip, { tokens: 10, lastRefill: now })
    }

    const limit = this.technicalLimits.get(ip)
    
    // Remove IPs antigos para evitar memory leak
    this.cleanupOldIPs()
    
    // Recarrega tokens (1 por segundo)
    const timePassed = now - limit.lastRefill
    const tokensToAdd = Math.floor(timePassed / 1000)
    
    if (tokensToAdd > 0) {
      limit.tokens = Math.min(10, limit.tokens + tokensToAdd)
      limit.lastRefill = now
    }

    if (limit.tokens <= 0) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((limit.lastRefill + 1000 - now) / 1000)
      }
    }

    limit.tokens--
    return {
      allowed: true,
      remaining: limit.tokens,
      retryAfter: 0
    }
  }

  checkBusinessLimit() {
    const now = Date.now()
    const timePassed = now - this.businessLastRefill
    const tokensToAdd = timePassed * this.businessRefillRate
    
    this.businessTokens = Math.min(1000, this.businessTokens + tokensToAdd)
    this.businessLastRefill = now

    if (this.businessTokens < 1) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((1 / this.businessRefillRate) / 1000)
      }
    }

    this.businessTokens--
    return {
      allowed: true,
      remaining: Math.floor(this.businessTokens),
      retryAfter: 0
    }
  }

  cleanupOldIPs() {
    const now = Date.now()
    for (const [ip, data] of this.technicalLimits.entries()) {
      if (now - data.lastRefill > 60000) { // Remove após 1 minuto inativo
        this.technicalLimits.delete(ip)
      }
    }
  }
}

module.exports = new RateLimiter()