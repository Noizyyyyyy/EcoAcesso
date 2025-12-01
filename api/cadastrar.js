const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { cpf } = require('node-cpf'); 

// IMPORTANTE: Este código depende de variáveis de ambiente configuradas no seu ambiente de execução.
// Elas devem ser definidas como SUPABASE_URL e SUPABASE_KEY.

// 1. Variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Expressão Regular para validação de formato de e-mail
const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// 2. Inicialização e Verificação de Configuração
// Se as chaves estiverem faltando, esta verificação falhará primeiro.
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("ERRO CRÍTICO DE CONFIGURAÇÃO: As variáveis SUPABASE_URL ou SUPABASE_KEY não foram encontradas.");
    
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
    // 1. Apenas aceite requisições POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Método não permitido. Apenas POST é aceito." });
    }

    let data;
    try {
        // Assume que o corpo da requisição é JSON
        data = req.body; 
    } catch (e) {
        return res.status(400).json({ error: "Corpo da requisição deve ser JSON válido." });
    }

    // 2. Extrai e valida os dados
    const { 
        nome, 
        email, 
        senha, 
        cpf: rawCpf, // Renomeia para evitar conflito
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
        termos_aceitos // Campo obrigatório no frontend
    } = data;
    
    // 3. Validação de campos obrigatórios
    if (!nome || !email || !senha || !rawCpf || !termos_aceitos) {
        return res.status(400).json({ error: "Campos obrigatórios (Nome, E-mail, Senha, CPF, Termos) não preenchidos." });
    }

    // Validação de formato de E-mail
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "O formato do e-mail é inválido." });
    }

    // Validação de tamanho da senha (mínimo 6 caracteres, conforme o HTML)
    if (senha.length < 6) {
        return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
    }
    
    // Limpa e valida o CPF
    const cleanCpf = rawCpf.replace(/\D/g, ''); // Remove máscara
    if (!cpf.isValid(cleanCpf)) {
        return res.status(400).json({ error: "O CPF fornecido é inválido. Por favor, verifique." });
    }

    // 4. Tratamento e Preparação dos Dados
    
    // Criptografa a senha antes de salvar (SALT de 10 rodadas)
    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(senha, 10);
    } catch (hashError) {
        console.error('Erro ao criptografar senha:', hashError);
        return res.status(500).json({ error: "Falha interna ao processar a senha." });
    }

    // Converte a string de interesses para Array (separado por vírgulas) ou null
    let interessesArray = null;
    if (interesses && typeof interesses === 'string' && interesses.trim() !== '') {
        // Converte a string (Ex: "Reflorestamento, Energia Solar") em array
        interessesArray = interesses.split(',').map(s => s.trim()).filter(s => s.length > 0);
        // Se o array resultante for vazio, volta para null
        if (interessesArray.length === 0) {
             interessesArray = null;
        }
    }


    // 5. Estrutura de dados para o Supabase
    const cadastroData = {
        // Mapeamentos obrigatórios
        nome_completo: nome,
        email: email,
        senha_hash: hashedPassword, // Salva a senha criptografada
        cpf: cleanCpf,
        
        // Mapeamentos de dados pessoais
        data_nascimento: data_nascimento || null, // Se vazio, salva NULL
        genero: genero || null,
        
        // Mapeamentos de endereço e preferências
        telefone: telefone ? telefone.replace(/\D/g, '') : null, // Salva apenas números
        cep: cep ? cep.replace(/\D/g, '') : null,
        logradouro: logradouro || null,
        numero: numero || null,
        bairro: bairro || null,
        cidade: cidade || null,
        estado: estado || null,
        
        // Campos de Array/Booleano
        interesses: interessesArray, 
        receber_newsletter: receber_newsletter || false,
        receber_eventos: receber_eventos || false,
        termos_aceitos: termos_aceitos, // Deve ser true para passar na validação
        
        // Campo padrão que você pode ter no seu DB
        email_confirmado: true
    };
    
    // 6. Insere no Supabase
    const { error } = await supabase
        .from('cadastro') // Substitua 'cadastro' pelo nome real da sua tabela, se for diferente
        .insert([cadastroData]);

    if (error) {
        console.error('Erro no Supabase:', error);
        
        // Trata erro de duplicidade (código 23505 - key constraint violation)
        if (error.code === '23505') {
            return res.status(409).json({ message: "O e-mail ou CPF já está cadastrado. Por favor, utilize outro." });
        }
        
        // Retorna a mensagem de erro da Supabase, se disponível, ou uma mensagem genérica
        return res.status(500).json({ message: error.message || "Falha ao cadastrar no banco de dados. Verifique a configuração RLS e o esquema da tabela." });
    }

    // 7. Resposta de sucesso (Status 201: Created)
    res.status(201).json({ message: "Usuário cadastrado com sucesso!", email: email });

};
