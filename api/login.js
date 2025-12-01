// api/login.js - Exemplo de função Serverless do Vercel
import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente do Vercel são acessíveis via process.env em funções Node.js.
// É uma boa prática inicializar o cliente fora do handler (se a plataforma suportar)
// para reutilizar a conexão (cold start optimization), mas para segurança, vamos
// garantir que as chaves sejam lidas robustamente.

// 1. Defina as chaves de forma segura
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// 2. Função de depuração (debug) para garantir que as chaves estão sendo lidas
// Você pode remover esta linha após o debug, mas ela é crucial agora:
console.log('STATUS DAS CHAVES - URL Length:', SUPABASE_URL ? SUPABASE_URL.length : 0, ' | Key Set:', !!SUPABASE_KEY);


// 3. Verificação de segurança: se as chaves estiverem ausentes, evite a inicialização
if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Se estiverem faltando, lance um erro informativo ANTES de inicializar o cliente.
  // Isso deve aparecer nos logs do Vercel e evitar o erro genérico do Supabase.
  throw new Error("SUPABASE_URL ou SUPABASE_KEY não foram encontrados no ambiente.");
}

// 4. Inicialize o cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


// 5. Exporte o handler da sua função serverless
export default async function handler(req, res) {
  try {
    // Exemplo de lógica de login
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    const { email, password } = req.body;

    // Use o cliente Supabase inicializado
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Erro de login do Supabase:', error.message);
      return res.status(401).json({ error: error.message });
    }

    // Se o login for bem-sucedido
    res.status(200).json({ user: data.user, session: data.session });

  } catch (e) {
    console.error('Erro na função de login:', e.message);
    // Retorna um erro 500 para o frontend
    res.status(500).json({ error: 'Erro interno do servidor: ' + e.message });
  }
}
