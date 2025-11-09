const { createClient } = require('redis')

/// Configura o cliente Redis usando a URL do .env
const client = createClient({
  url: process.env.REDIS_URL
})

client.on('error', (err) => console.error('❌ Erro no Cliente Redis', err))

// Encapsula a lógica de conexão para ser compatível com serverless
// Conecta, executa a ação, e desconecta
const runRedisCommand = async (commandCallback) => {
  if (client.isOpen) {
    // Se já estiver conectando (devido a uma race condition),
    // apenas executa o comando.
    return await commandCallback(client);
  }

  try {
    await client.connect();
    const result = await commandCallback(client);
    return result;
  } catch (err) {
    console.error('Erro na execução do comando Redis:', err);
    throw err;
  } finally {
    // Garante que o cliente feche a conexão
    await client.disconnect().catch(err => {
      console.error('Erro ao desconectar do Redis:', err);
    });
  }
}

module.exports = { runRedisCommand };