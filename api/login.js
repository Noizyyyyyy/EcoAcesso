// api/login.js

// Importa as bibliotecas necessárias
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// --- CONFIGURAÇÃO ---
// Variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Inicializa o cliente Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async (req, res) => {
    // 1. Garante que é uma requisição POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
    }

    try {
        // Pega o e-mail e a senha do corpo da requisição
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
        }

        // 2. Busca o hash da senha na tabela customizada 'cadastro'
        const { data: user, error: selectError } = await supabase
            .from('cadastro')
            // Seleciona apenas a senha_hash e o ID (ou outra informação necessária)
            .select('id, senha_hash') 
            .eq('email', email)
            .single(); 

        // Tratamento de erro de banco (exceto "nenhuma linha encontrada")
        if (selectError && selectError.code !== 'PGRST116') { 
            console.error('Erro ao buscar usuário no Supabase:', selectError);
            return res.status(500).json({ error: 'Falha no servidor. Tente novamente.' });
        }
        
        // 3. Verifica se o usuário existe
        if (!user) {
            // Retorna erro genérico para segurança (não diz se o e-mail existe)
            return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail ou senha.' });
        }

        // 4. Compara a senha fornecida com o hash salvo
        const passwordMatch = await bcrypt.compare(senha, user.senha_hash);

        if (!passwordMatch) {
            // Senha incorreta (erro de autenticação)
            return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail ou senha.' });
        }

        // 5. SUCESSO!
        // Retorna a resposta 200 que o seu login.html espera para redirecionar.
        return res.status(200).json({ 
            success: true, 
            message: 'Login bem-sucedido! Redirecionando...',
            user_id: user.id // Opcional: retorna o ID do usuário
        });

    } catch (e) {
        // 6. Erro no servidor ou na conexão
        console.error('Erro na função de login:', e);
        return res.status(500).json({ error: 'Falha no servidor ao processar o login.' });
    }
};
