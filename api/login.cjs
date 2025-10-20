// api/login.cjs

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
    // CORREÇÃO CRÍTICA: Inicialização do Supabase movida para dentro da função.
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
    }

    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
        }

        // 1. Buscar o hash da senha na tabela customizada 'cadastro'
        const { data: user, error: selectError } = await supabase
            .from('cadastro')
            .select('id, senha_hash') 
            .eq('email', email)
            .single();

        // 2. Tratamento de erro de banco (PGRST116 é "No rows found")
        if (selectError && selectError.code !== 'PGRST116') { 
            console.error('Erro ao buscar usuário no Supabase:', selectError);
            return res.status(500).json({ error: 'Falha no servidor. Tente novamente.' });
        }
        
        // 3. Verificar se o usuário existe
        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail ou senha.' });
        }

        // 4. Comparar a senha fornecida com o hash salvo
        const passwordMatch = await bcrypt.compare(senha, user.senha_hash);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail ou senha.' });
        }

        // 5. SUCESSO!
        return res.status(200).json({ 
            success: true, 
            message: 'Login bem-sucedido! Redirecionando...',
            user_id: user.id
        });
        
    } catch (e) {
        console.error('Erro na função de login:', e);
        return res.status(500).json({ error: 'Falha no servidor ao processar o login.' });
    }
};
