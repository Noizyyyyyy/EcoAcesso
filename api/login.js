// api/login.js - Exemplo de função Serverless do Vercel
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Verificação de ambiente (já confirmamos que está OK)
if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("SUPABASE_URL ou SUPABASE_KEY não foram encontrados no ambiente.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    // Nota: O método signInWithPassword espera a senha em texto puro. 
    // Ele usa a tabela interna `auth.users` do Supabase e não um campo customizado como `senha_hash`.
    const { email, password } = req.body;

    // --- BLOCO DE DEBUG CRÍTICO ---
    // Este log mostrará exatamente o email e a senha (não use isso em produção!)
    // Use-o APENAS para confirmar que os dados chegam corretamente do frontend.
    console.log(`DEBUG LOGIN: Tentativa de login com Email: "${email}" e Senha (comprimento): ${password ? password.length : 0}`);
    // -----------------------------

    // Validação básica para garantir que os campos não estão vazios
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password, // Aqui é a senha em texto simples enviada pelo usuário
    });

    if (error) {
      // O erro 'Invalid login credentials' é capturado aqui
      console.error('Erro de login do Supabase:', error.message);
      return res.status(401).json({ error: error.message });
    }

    // Se o login for bem-sucedido
    res.status(200).json({ user: data.user, session: data.session });

  } catch (e) {
    console.error('Erro na função de login:', e.message);
    res.status(500).json({ error: 'Erro interno do servidor: ' + e.message });
  }
}
