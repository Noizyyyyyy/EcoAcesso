const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { cpf } = require('node-cpf'); 

// 1. Variáveis de ambiente
// USAMOS SUPABASE_KEY, conforme a informação do seu projeto Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Expressão Regular para validação de formato de e-mail
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 2. Inicialização e Verificação de Configuração
// Se as chaves estiverem faltando, esta verificação falhará primeiro.
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("ERRO CRÍTICO DE CONFIGURAÇÃO: As variáveis SUPABASE_URL ou SUPABASE_KEY não foram encontradas. Verifique o painel do Vercel.");
    
    // Retorna uma função válida que informa o erro 500
    module.exports = (req, res) => {
        res.status(500).json({ error: "Configuração do servidor inválida. Chaves da base de dados ausentes." });
    };
    
    // Interrompe a execução do script se as chaves estiverem ausentes
    return; 
}

// Cria o cliente Supabase APÓS a verificação das chaves
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Exporta a função Serverless principal
module.exports = async (req, res) => {
    // Apenas aceite requisições POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        // Desempacotar TODOS os campos do JSON enviado pelo frontend (cadastro.html)
        const {
            nome,
            email,
            senha,
            cpf: cpfInput, // Renomeado para não conflitar com a função 'cpf'
            telefone,
            cep,
            logradouro,
            numero,
            bairro,
            cidade,
            estado,
            termos, // O frontend envia 'termos'
            interesses,
            receber_newsletter,
            receber_eventos
        } = req.body;

        // 3. Validação de campos obrigatórios
        if (!email || !senha || !nome || !cpfInput || !termos) {
            return res.status(400).json({ error: "Nome, email, senha, CPF e termos são obrigatórios." });
        }
        
        // --- VALIDAÇÃO DE FORMATO DE E-MAIL ---
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'O formato do e-mail é inválido. Verifique o endereço.' });
        }

        // --- VALIDAÇÃO DE CPF (Estrutural) ---
        const cpfLimpo = cpfInput.replace(/\D/g, ''); // Remove formatação (pontos/traços)
        
        if (!cpf.validate(cpfLimpo)) {
            return res.status(400).json({ error: 'O CPF fornecido é inválido. Verifique os números.' });
        }

        // 4. Criptografar a senha
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(senha, salt);

        // 5. Mapear os dados para o formato da tabela 'cadastro' e inserir
        const cadastroData = {
            // Mapeamentos obrigatórios
            nome_completo: nome,
            email: email,
            senha_hash: hashedPassword, // Salva o hash
            cpf: cpfLimpo, // Salva o CPF limpo
            termos_aceitos: termos, // Mapeia 'termos' do front para 'termos_aceitos' do DB

            // Mapeamentos opcionais / de endereço
            telefone: telefone,
            cep: cep,
            logradouro: logradouro,
            numero: numero,
            bairro: bairro,
            cidade: cidade,
            estado: estado,
            interesses: interesses,
            receber_newsletter: receber_newsletter || false,
            receber_eventos: receber_eventos || false,
            
            // Campo padrão
            email_confirmado: true
        };
        
        const { error } = await supabase
            .from('cadastro')
            .insert([cadastroData]);

        if (error) {
            console.error('Erro no Supabase:', error);
            // Trata erro de duplicidade (código 23505)
            if (error.code === '23505') {
                return res.status(409).json({ error: "O e-mail ou CPF já está cadastrado. Por favor, utilize outro." });
            }
            // Retorna a mensagem de erro da Supabase, se disponível, ou uma mensagem genérica
            return res.status(500).json({ error: error.message || "Falha ao cadastrar no banco de dados. Verifique o RLS." });
        }

        // 6. Resposta de sucesso
        res.status(201).json({ message: "Usuário cadastrado com sucesso!", email: email });

    } catch (error) {
        console.error('Erro interno do servidor:', error);
        res.status(500).json({ error: "Erro interno do servidor. Falha no processamento da requisição." });
    }
};
