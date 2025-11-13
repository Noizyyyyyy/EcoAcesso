// api/cadastrar.cjs
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// 1. Obter as variáveis de ambiente do Vercel
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// 2. Criar o cliente Supabase
// Se as chaves estiverem faltando, isso gera um erro 500 imediato, o que é bom para diagnóstico.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("ERRO DE CONFIGURAÇÃO CRÍTICO: Chaves do Supabase ausentes.");
    module.exports = (req, res) => {
        res.status(500).json({ error: "Configuração do servidor inválida." });
    };
    return;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
    // Apenas aceite requisições POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        // 3. Desempacotar TODOS os campos do JSON enviado pelo frontend
        const {
            nome,
            email,
            senha,
            cpf,
            telefone,
            cep,
            logradouro,
            numero,
            bairro,
            cidade,
            estado,
            interesses, // string separada por vírgulas
            termos_aceitos, // boolean
            receber_newsletter, // boolean
            receber_eventos // boolean
        } = req.body;

        // Validação básica do lado do servidor
        if (!email || !senha || !nome) {
            return res.status(400).json({ error: "Nome, email e senha são obrigatórios." });
        }
        
        // 4. Criptografar a senha (usando 10 rounds de sal)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(senha, salt);

        // 5. Inserir TODOS os dados na tabela 'cadastro'
        const { data, error } = await supabase
            .from('cadastro')
            .insert([
                {
                    nome: nome,
                    email: email,
                    senha: hashedPassword, // Senha criptografada
                    cpf: cpf,
                    telefone: telefone,
                    cep: cep,
                    logradouro: logradouro,
                    numero: numero,
                    bairro: bairro,
                    cidade: cidade,
                    estado: estado,
                    interesses: interesses,
                    termos_aceitos: termos_aceitos,
                    receber_newsletter: receber_newsletter,
                    receber_eventos: receber_eventos
                }
            ]);

        if (error) {
            console.error('Erro no Supabase:', error);
            // Verifica se é um erro de duplicidade (código 23505)
            if (error.code === '23505') {
                 return res.status(409).json({ error: "O e-mail ou CPF já está cadastrado. Por favor, utilize outro." });
            }
            return res.status(500).json({ error: error.message || "Falha ao cadastrar no banco de dados." });
        }

        // 6. Resposta de sucesso
        res.status(201).json({ message: "Usuário cadastrado com sucesso!", data: data });

    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};