import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async (req, res) => {
    // 1. Apenas aceita requisições GET (do clique no link)
    if (req.method !== 'GET') {
        return res.status(405).send('Método não permitido.');
    }

    const { token } = req.query; // Pega o token da URL

    if (!token) {
        return res.status(400).send('Token de confirmação ausente.');
    }

    // 2. Procura o usuário com esse token
    const { data, error } = await supabase
        .from('cadastro')
        .select('*')
        .eq('confirmacao_token', token)
        .single(); // Espera apenas um resultado

    if (error || !data) {
        console.error('Erro ao buscar token:', error);
        // Redireciona para uma página de erro ou login
        return res.redirect('/login?status=invalid_token'); 
    }

    // 3. Atualiza o status do e-mail
    const { error: updateError } = await supabase
        .from('cadastro')
        .update({ email_confirmado: true, confirmacao_token: null }) // Limpa o token por segurança
        .eq('id', data.id); // Usa o ID do registro encontrado

    if (updateError) {
        console.error('Erro ao atualizar status:', updateError);
        return res.redirect('/login?status=error_confirming');
    }

    // 4. Sucesso! Redireciona o usuário
    res.redirect('/login?status=confirmed');
};
