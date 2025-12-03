import { createClient } from '@supabase/supabase-js';

// *******************************************************************
// AVISO: PARA PROD, esta chave DEVE ser a Service Role Key. 
// Em um ambiente de produção REAL, NUNCA use a Service Role Key 
// em um endpoint público. Estamos usando para este PROTÓTIPO DE FEIRA
// DE CIÊNCIAS funcionar sem autenticação e RLS complexos.
// *******************************************************************

// Usa a nomenclatura padrão do Vercel
const supabaseUrl = process.env.SUPABASE_URL || 'SUA_URL_SUPABASE'; 
const supabaseServiceKey = process.env.SUPABASE_KEY || 'SUA_CHAVE_DE_SERVIÇO'; 

// Cria o cliente Supabase usando a chave de Serviço para ter permissão de escrita
// (caso SUPABASE_KEY seja a Service Role Key, que é o que precisamos para o protótipo)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

/**
 * Endpoint para confirmação manual de e-mail.
 * Ele recebe um 'token' da URL, busca o registro correspondente
 * na tabela 'cadastro' e atualiza o campo 'email_confirmado' para true.
 */
export default async (req, res) => {
    // 1. Apenas aceita requisições GET (do clique no link no e-mail)
    if (req.method !== 'GET') {
        return res.status(405).send('Método não permitido.');
    }

    const { token } = req.query; // Pega o token da URL

    if (!token) {
        // Redireciona para uma página de erro
        return res.redirect('/login?status=error&mensagem=Token_ausente'); 
    }

    // 2. Procura o usuário com esse token na tabela 'cadastro'
    const { data, error } = await supabase
        .from('cadastro')
        .select('id') // Apenas precisamos do ID
        .eq('confirmacao_token', token)
        .single(); 

    if (error || !data) {
        console.error('Erro ou token inválido/expirado:', error?.message || 'Token não encontrado.');
        // Redireciona para uma página de erro ou login
        return res.redirect('/login?status=error&mensagem=Token_invalido'); 
    }

    // 3. Atualiza o status do e-mail e limpa o token
    const { error: updateError } = await supabase
        .from('cadastro')
        .update({ 
            email_confirmado: true, 
            confirmacao_token: null // Limpa o token por segurança, mesmo no protótipo
        }) 
        .eq('id', data.id); // Usa o ID do registro encontrado

    if (updateError) {
        console.error('Erro ao atualizar status:', updateError.message);
        return res.redirect('/login?status=error&mensagem=Erro_na_confirmacao');
    }

    // 4. Sucesso! Redireciona o usuário para a página de sucesso
    // Use a rota que você tem no seu frontend para mostrar o sucesso da confirmação.
    res.redirect('/login?status=sucesso&mensagem=Email_confirmado');
};
