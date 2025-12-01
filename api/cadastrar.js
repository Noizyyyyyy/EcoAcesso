const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { cpf } = require('node-cpf');

// 1. Variáveis de ambiente
// USAMOS SUPABASE_KEY, conforme a informação do seu projeto Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Expressão Regular para validação de formato de e-mail
const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

// 2. Inicialização e Verificação de Configuração
// Se as chaves estiverem faltando, esta verificação falhará primeiro.
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("ERRO CRÍTICO DE CONFIGURAÇÃO: As variáveis SUPABASE_URL ou SUPABASE_KEY não foram encontradas. Verifique o painel do Vercel.");

    // Retorna uma função válida que informa o erro 500
    module.exports = (req, res) => {
        // Envia resposta 500 de volta ao cliente
        res.status(500).json({ message: "Configuração do servidor inválida. Chaves da base de dados ausentes." });
    };

    // Interrompe a execução do script se as chaves estiverem ausentes
    return;
}

// Cria o cliente Supabase APÓS a verificação das chaves
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Função Serverless principal
module.exports = async (req, res) => {
    // Apenas aceite requisições POST
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido. Apenas POST é suportado.' });
    }

    try {
        // 3. Dessestruturação dos dados recebidos
        const {
            email,
            senha,
            nome,
            cpf: cpfInput, // Renomeado para evitar conflito com a biblioteca
            data_nascimento,
            genero,
            telefone,
            cep,
            logradouro,
            numero,
            bairro,
            cidade,
            estado,
            interesses,
            receber_newsletter,
            receber_eventos,
            termos_aceitos // Certifique-se de que este campo está sendo enviado do frontend
        } = req.body;

        // 4. Validação dos dados (Melhorias)

        // Campos obrigatórios básicos
        if (!email || !senha || !nome || !cpfInput || !termos_aceitos) {
            return res.status(400).json({ message: "Dados incompletos. E-mail, senha, nome, CPF e aceitação dos termos são obrigatórios." });
        }

        // Validação de formato de E-mail
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Formato de e-mail inválido." });
        }

        // Validação e formatação do CPF
        let cpfFormatado = cpf.format(cpfInput);
        // Opcional: validar se o CPF é matematicamente válido (sempre recomendado)
        if (!cpf.isValid(cpfInput)) {
             return res.status(400).json({ message: "CPF inválido." });
        }

        // Validação de senha (mínimo de 6 caracteres)
        if (senha.length < 6) {
             return res.status(400).json({ message: "A senha deve ter no mínimo 6 caracteres." });
        }

        // 5. Hash da senha
        // Gere um hash da senha antes de salvar no banco de dados.
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        // 6. Preparação dos dados para Supabase
        const cadastroData = {
            email: email.toLowerCase(), // Salvar em minúsculas
            senha: senhaHash,           // Salva o hash, não a senha em texto simples
            nome: nome,
            cpf: cpfFormatado,          // Salva o CPF formatado (ou sem formatação, dependendo do design da sua DB)
            data_nascimento: data_nascimento,
            genero: genero,
            termos_aceitos: termos_aceitos, // Mapeia o campo termos_aceitos do DB

            // Mapeamentos opcionais / de endereço
            telefone: telefone || null,
            cep: cep || null,
            logradouro: logradouro || null,
            numero: numero || null,
            bairro: bairro || null,
            cidade: cidade || null,
            estado: estado || null,
            // Interesses é um array, certifique-se de que é um array ou null
            interesses: (interesses && Array.isArray(interesses)) ? interesses : null,
            receber_newsletter: receber_newsletter || false,
            receber_eventos: receber_eventos || false,

            // Campo padrão
            email_confirmado: true
        };

        // 7. Inserção no Supabase
        const { error } = await supabase
            .from('cadastro') // Nome da sua tabela
            .insert([cadastroData]);

        if (error) {
            console.error('Erro no Supabase:', error);
            // Trata erro de duplicidade (código 23505 - erro padrão do PostgreSQL para violação de UNIQUE constraint)
            if (error.code === '23505') {
                return res.status(409).json({ message: "O e-mail ou CPF já está cadastrado. Por favor, utilize outro." });
            }
            // Retorna a mensagem de erro da Supabase, se disponível, ou uma mensagem genérica
            // O erro 500 neste ponto pode indicar problemas de RLS (Row Level Security)
            return res.status(500).json({ message: error.message || "Falha ao cadastrar no banco de dados. Verifique o RLS, permissões da tabela e o 'anon key' do Supabase." });
        }

        // 8. Resposta de sucesso
        // Status 201 significa "Criado"
        res.status(201).json({ message: "Usuário cadastrado com sucesso!", email: email });

    } catch (error) {
        // 9. Tratamento de erro geral (o provável 500 que você estava vendo)
        // Isso captura erros como 'cpf' ou 'bcrypt' não sendo importados ou problemas na desestruturação
        console.error('*** ERRO INTERNO DO SERVIDOR (500) ***:', error);
        // Certifique-se de que a resposta de erro esteja no formato JSON
        res.status(500).json({ message: "Erro interno do servidor. Falha no processamento. Verifique os logs do Vercel para mais detalhes." });
    }
};
