const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// 1. Obter as variáveis de ambiente do Vercel
// Usando 'SUPABASE_KEY' como padrão para a chave pública/anon
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; 

// 2. Criar o cliente Supabase
// Se as chaves estiverem faltando, isso gera um erro 500 imediato e informa no console.
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("ERRO DE CONFIGURAÇÃO CRÍTICO: Variáveis SUPABASE_URL ou SUPABASE_KEY ausentes. Verifique as variáveis de ambiente no Vercel.");
    module.exports = (req, res) => {
        res.status(500).json({ error: "Configuração do servidor inválida. Chaves da base de dados não encontradas." });
    };
    return;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
            interesses, 
            termos_aceitos, 
            receber_newsletter, 
            receber_eventos 
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
            ])
            // Adiciona a opção para retornar o registo inserido, útil para depuração
            .select(); 

        if (error) {
            console.error('Erro no Supabase:', error);
            // Verifica se é um erro de duplicidade (código 23505 - erro PostgreSQL)
            if (error.code === '23505') {
                 return res.status(409).json({ error: "O e-mail ou CPF já está cadastrado. Por favor, utilize outro." });
            }
            return res.status(500).json({ error: error.message || "Falha ao cadastrar no banco de dados." });
        }

        // 6. Resposta de sucesso
        res.status(201).json({ message: "Usuário cadastrado com sucesso!", data: data });

    } catch (error) {
        console.error('Erro interno do servidor:', error);
        res.status(500).json({ error: "Erro interno do servidor. Verifique os logs para mais detalhes." });
    }
};
