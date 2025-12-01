import { createClient } from '@supabase/supabase-js';

// Variáveis de ambiente (Configuradas no seu ambiente de hospedagem)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // A chave pública do Supabase

let supabase;

try {
  // 1. Verificar se as variáveis de ambiente estão definidas ANTES de inicializar
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("As variáveis de ambiente SUPABASE_URL ou SUPABASE_KEY estão em falta. Por favor, configure-as no seu ambiente de hospedagem.");
  }
  
  // 2. Inicializar o cliente Supabase usando a SUPABASE_KEY
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      // Desabilitar o refresh e a persistência é importante para funções serverless
      autoRefreshToken: false,
      persistSession: false,
    }
  });

} catch (e) {
  // Capturar erros de inicialização (principalmente missing env vars)
  console.error("ERRO DE INICIALIZAÇÃO DO SUPABASE:", e.message);
  // Define uma função de erro de fallback para ser usada no handler
  supabase = { initializationError: e.message };
}

// Usamos 'export default' para módulos ES6, substituindo 'module.exports'
export default async (req, res) => {
  // Configurações CORS (Manter antes de qualquer retorno para garantir que o pre-flight funcione)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Lida com a requisição OPTIONS (pré-voo do CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Apenas aceita requisições POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  // 3. Verificar o erro de inicialização capturado
  if (supabase.initializationError) {
    console.error("FALHA CRÍTICA DE SETUP:", supabase.initializationError);
    // Retorna 500 em formato JSON
    return res.status(500).json({ 
      error: 'Erro de configuração no servidor. As chaves do Supabase estão em falta.', 
      details: supabase.initializationError 
    });
  }

  try {
    // --- NOVO: Logging para diagnóstico ---
    console.log('DEBUG BODY (API): Recebendo body:', req.body);
    // -------------------------------------

    const { email, password } = req.body;

    if (!email || !password) {
      console.log('DEBUG ERROR (API): Email ou senha ausentes no corpo da requisição.');
      return res.status(400).json({ 
        error: 'Email e senha são obrigatórios.',
        details: 'Verifique se o Content-Type é application/json e se o corpo da requisição está formatado corretamente.'
      });
    }

    console.log(`DEBUG LOGIN (API): Tentativa de login com Email: "${email}"`);

    // Chamada de login do Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Erro de Autenticação do Supabase:', error.message);
      
      // Mapeamento de erro para resposta do cliente
      let errorMessage = 'Credenciais inválidas. Verifique seu email e senha.';
      let status = 401; // Unauthorized
      
      if (!error.message.includes('Invalid login credentials')) {
        errorMessage = 'Falha no login: ' + error.message;
        status = 400; // Bad Request para outros erros de validação
      }

      return res.status(status).json({ 
        error: errorMessage
      });
    }

    // Login bem-sucedido
    const user = {
      id: data.user.id,
      email: data.user.email,
    };
    
    // Retorna o token de sessão e informações básicas do usuário.
    res.status(200).json({ 
      message: 'Login bem-sucedido!',
      user: user,
      token: data.session?.access_token
    });

  } catch (error) {
    // 4. Tratamento de erro geral (o último recurso)
    console.error('Erro inesperado na lógica de autenticação:', error);
    // Garante que SEMPRE retorna um JSON
    res.status(500).json({ error: 'Erro interno do servidor. Não foi possível processar a requisição.', details: error.message });
  }
};
