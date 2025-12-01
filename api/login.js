const { createClient } = require('@supabase/supabase-js');

// Variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Inicializa o cliente Supabase.
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

module.exports = async (req, res) => {
  // Apenas aceita requisições POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  // Configurações CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Lida com a requisição OPTIONS (pré-voo do CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    console.log(`DEBUG REGISTER (API): Tentativa de registro com Email: "${email}"`);

    // Chamada de registro do Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('Erro do Supabase:', error.message);
      
      // O Supabase usa um código '400' ou similar, mas a mensagem de erro
      // 'User already registered' é o que buscamos para retornar 409 ao frontend.
      if (error.message.includes('User already registered') || error.message.includes('A user with this email address already exists')) {
        // Retorna o 409 Conflict, que o frontend irá tratar.
        return res.status(409).json({ error: 'Este email já está registrado. Por favor, faça login.' });
      }

      // Outros erros (senha muito fraca, etc.)
      return res.status(400).json({ error: 'Falha no registro: ' + error.message });
    }

    // Registro bem-sucedido
    const user = {
      id: data.user.id,
      email: data.user.email,
    };
    
    // Retorna o token de sessão e informações básicas do usuário.
    res.status(201).json({ 
      message: 'Registro bem-sucedido. Por favor, verifique seu email para confirmar.',
      user: user,
      token: data.session?.access_token || null // O token pode ser nulo dependendo das configurações de email de confirmação.
    });

  } catch (error) {
    console.error('Erro inesperado no servidor:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};
