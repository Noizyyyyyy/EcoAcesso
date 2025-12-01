import { createClient } from '@supabase/supabase-js';
// O bcryptjs foi removido do package.json para evitar falhas de build/runtime no Vercel.
// import bcrypt from 'bcryptjs'; 

// IMPORTANTE: Este código usa o sistema de módulos ES (import/export)
// O seu package.json DEVE ter "type": "module" para isso funcionar.

// 1. Variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Expressão Regular para validação de formato de e-mail
const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Declara a variável supabase no escopo do módulo para reutilização
let supabase = null;

/**
 * Função de validação de CPF (Substitui a biblioteca node-cpf)
 * Implementação nativa para maior compatibilidade em ambientes Serverless.
 */
function isValidCPF(cpf) {
    if (!cpf) return false;
    cpf = cpf.replace(/[^\d]/g, ""); // Remove caracteres não numéricos
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false; // Verifica tamanho e sequências repetidas

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;

    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;

    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;
    
    return true;
}

// Exporta a função Serverless principal para ES Modules
export default async (req, res) => {
    // 1. Apenas aceite requisições POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Método não permitido. Apenas POST é aceito." });
    }

    // 2. Inicialização e Verificação de Configuração
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error("ERRO CRÍTICO DE CONFIGURAÇÃO: As variáveis SUPABASE_URL ou SUPABASE_KEY não foram encontradas.");
        return res.status(500).json({ error: "Configuração do servidor inválida. Chaves da base de dados ausentes." });
    }

    // Inicializa o cliente Supabase se ainda não foi inicializado (para otimizar cold starts)
    if (!supabase) {
        try {
            supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        } catch (e) {
            console.error("Erro ao inicializar o cliente Supabase:", e.message);
            return res.status(500).json({ error: "Falha na conexão com o banco de dados. Verifique o URL e a Chave." });
        }
    }


    let data;
    try {
        // Assume que o corpo da requisição é JSON
        data = req.body; 
    } catch (e) {
        return res.status(400).json({ error: "Corpo da requisição deve ser JSON válido." });
    }

    // 3. Extrai e valida os dados
    const { 
        nome, 
        email, 
        senha, 
        cpf: rawCpf, 
        data_nascimento,
        genero, 
        telefone,
        cep,
        logradouro,
        numero,
        bairro,
        cidade,
        estado,
        interesses, // Extraído, mas não será usado na inserção
        receber_newsletter, // Extraído, mas não será usado na inserção
        receber_eventos, // Extraído, mas não será usado na inserção
        termos_aceitos 
    } = data;
    
    // 4. Validação de campos obrigatórios
    if (!nome || !email || !senha || !rawCpf || !termos_aceitos) {
        return res.status(400).json({ error: "Campos obrigatórios (Nome, E-mail, Senha, CPF, Termos) não preenchidos." });
    }

    // Validação de formato de E-mail
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "O formato do e-mail é inválido." });
    }

    // Validação de tamanho da senha (mínimo 6 caracteres)
    if (senha.length < 6) {
        return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
    }
    
    // Limpa e valida o CPF usando a função embutida
    const cleanCpf = rawCpf.replace(/\D/g, ''); // Remove máscara
    if (!isValidCPF(cleanCpf)) { // Uso da função nativa
        return res.status(400).json({ error: "O CPF fornecido é inválido. Por favor, verifique." });
    }

    // 5. Tratamento e Preparação dos Dados
    
    // ***** ATENÇÃO: A CRIPTOGRAFIA DE SENHA FOI REMOVIDA *****
    const senhaParaSalvar = senha;
    
    // A lógica de conversão de interesses foi removida, pois a coluna 'interesses' não existe no esquema SQL.
    /*
    let interessesArray = null;
    if (interesses && typeof interesses === 'string' && interesses.trim() !== '') {
        interessesArray = interesses.split(',').map(s => s.trim()).filter(s => s.length > 0);
        if (interessesArray.length === 0) {
             interessesArray = null;
        }
    }
    */


    // 6. Estrutura de dados para o Supabase
    const cadastroData = {
        // Mapeamentos obrigatórios
        nome_completo: nome,
        email: email,
        senha_hash: senhaParaSalvar, // Salva a senha em texto simples (APENAS PARA TESTES/DEMONSTRAÇÃO)
        cpf: cleanCpf,
        
        // Mapeamentos de dados pessoais
        data_nascimento: data_nascimento || null, // Se vazio, salva NULL
        // As colunas 'genero', 'interesses', 'receber_newsletter', e 'receber_eventos' 
        // foram removidas deste objeto para corresponder ao esquema SQL fornecido.
        
        // Mapeamentos de endereço e preferências
        telefone: telefone ? telefone.replace(/\D/g, '') : null, // Salva apenas números
        cep: cep ? cep.replace(/\D/g, '') : null,
        logradouro: logradouro || null,
        numero: numero || null,
        bairro: bairro || null,
        cidade: cidade || null,
        estado: estado || null,
        
        // Campos de Array/Booleano
        // Campos de preferência removidos para coincidir com o SQL.
        
        receber_newsletter: false, // Mantido como default se for importante, mas não inserido
        receber_eventos: false, // Mantido como default se for importante, mas não inserido
        
        termos_aceitos: termos_aceitos, 
        
        // Campo padrão que você pode ter no seu DB
        email_confirmado: true
    };
    
    // 7. Insere no Supabase
    const { error } = await supabase
        .from('cadastro') 
        .insert([cadastroData]);

    if (error) {
        console.error('Erro no Supabase:', error);
        
        // Trata erro de duplicidade (código 23505 - key constraint violation)
        if (error.code === '23505') {
            return res.status(409).json({ message: "O e-mail ou CPF já está cadastrado. Por favor, utilize outro." });
        }
        
        // Se o erro for de coluna ou outro problema de RLS/Esquema
        return res.status(500).json({ message: error.message || "Falha ao cadastrar no banco de dados. Verifique a configuração RLS e o esquema da tabela." });
    }

    // 8. Resposta de sucesso (Status 201: Created)
    res.status(201).json({ message: "Usuário cadastrado com sucesso!", email: email });
};
