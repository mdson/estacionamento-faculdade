const { runRedisCommand } = require('../config/redis-client')

// 10 requisições por IP, numa janela de 1 segundo
const TECHNICAL_LIMIT_REQUESTS = 10
const TECHNICAL_LIMIT_WINDOW_S = 1

// 1000 requisições, numa janela de 1 hora
const BUSINESS_LIMIT_REQUESTS = 1000
const BUSINESS_LIMIT_WINDOW_S = 3600 // 1 hora

class RateLimiter {
  
  async checkTechnicalLimit(ip) {
    const key = `rate_tech:${ip}`
    let count = 0;

    try {
      await runRedisCommand(async (client) => {
        // INCR cria a chave com 1 se não existir
        count = await client.incr(key)
        
        // Se é a primeira vez, define a expiração
        if (count === 1) {
          await client.expire(key, TECHNICAL_LIMIT_WINDOW_S)
        }
      });
    } catch (err) {
      console.error("Erro no rate limit técnico (Redis):", err);
      // Em caso de falha do Redis, permite a requisição para não parar o serviço
      return { allowed: true, remaining: 0 };
    }

    if (count > TECHNICAL_LIMIT_REQUESTS) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: TECHNICAL_LIMIT_WINDOW_S
      }
    }

    return {
      allowed: true,
      remaining: TECHNICAL_LIMIT_REQUESTS - count,
      retryAfter: 0
    }
  }

  async checkBusinessLimit() {
    const key = `rate_business` // Chave global
    let count = 0;

    try {
      await runRedisCommand(async (client) => {
        count = await client.incr(key)
        if (count === 1) {
          // Define a expiração para 1 hora (3600s)
          await client.expire(key, BUSINESS_LIMIT_WINDOW_S)
        }
      });
    } catch (err) {
      console.error("Erro no rate limit de negócio (Redis):", err);
      // Em caso de falha do Redis, permite a requisição
      return { allowed: true, remaining: 0 };
    }
    
    if (count > BUSINESS_LIMIT_REQUESTS) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: BUSINESS_LIMIT_WINDOW_S
      }
    }

    return {
      allowed: true,
      remaining: Math.floor(BUSINESS_LIMIT_REQUESTS - count),
      retryAfter: 0
    }
  }
}

module.exports = new RateLimiter()