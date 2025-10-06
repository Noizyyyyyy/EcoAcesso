import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Variáveis de ambiente (usadas no seu cadastro.js)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Inicializa o cliente Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
    }

    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
        }

        // 1. Buscar usuário pelo e-mail no Supabase
        // Como você desativou a confirmação, qualquer usuário salvo deve poder logar.
        const { data: user, error: selectError } = await supabase
            .from('cadastro')
            .select('senha_hash, email_confirmado')
            .eq('email', email)
            .single(); // Esperamos apenas um resultado

        if (selectError && selectError.code !== 'PGRST116') { // PGRST116 é "No rows found"
            console.error('Erro ao buscar usuário no Supabase:', selectError);
            // Evitar dar detalhes demais no erro para o usuário
            return res.status(500).json({ error: 'Falha no servidor. Tente novamente.' });
        }
        
        // 2. Verificar se o usuário existe
        if (!user) {
            // Retorna um erro genérico para não expor se o e-mail existe
            return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail ou senha.' });
        }

        // 3. Comparar a senha fornecida com o hash salvo
        const passwordMatch = await bcrypt.compare(senha, user.senha_hash);

        if (!passwordMatch) {
            // Senha incorreta
            return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail ou senha.' });
        }

        // 4. Se a senha for correta, o login é bem-sucedido
        // Aqui você pode integrar o serviço de autenticação do Supabase (Auth),
        // mas para esta API simples, apenas retornaremos o sucesso.
        
        // Em um sistema real, você retornaria um JWT (token de autenticação) aqui.
        return res.status(200).json({ message: 'Login bem-sucedido! Redirecionando...' });

    } catch (e) {
        console.error('Erro na função de login:', e);
        return res.status(500).json({ error: 'Falha no servidor ao processar o login.' });
    }
};
