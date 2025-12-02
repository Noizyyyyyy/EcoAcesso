import { createClient } from '@supabase/supabase-js';

// 1. Variáveis de ambiente
// ATENÇÃO: Use a CHAVE DE SERVIÇO (service_role key) se precisar de permissão total 
// para inserir no Auth E na tabela de perfil ao mesmo tempo no backend.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; 

// Expressão Regular para validação de formato de e-mail
const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

let supabase = null;

/**
 * Função de validação de CPF (mantida a sua implementação)
 */
function isValidCPF(cpf) {
    if (!cpf) return false;
    cpf = cpf.replace(/[^\d]/g, "");
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

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

// Exporta a função Serverless principal
export default async (req, res) => {
    // 1. Apenas aceite requisições POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Método não permitido. Apenas POST é aceito." });
    }

    // 2. Inicialização e Verificação de Configuração
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error("ERRO CRÍTICO DE CONFIGURAÇÃO: As variáveis SUPABASE_URL ou SUPABASE_SERVICE_KEY não foram encontradas.");
        return res.status(500).json({ error: "Configuração do servidor inválida. Chaves da base de dados ausentes." });
    }

    // Inicializa o cliente Supabase com a CHAVE DE SERVIÇO para ter permissão de escrever no Auth e na tabela.
    if (!supabase) {
        try {
            // Este cliente é o superusuário no seu backend para operações administrativas.
            supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        } catch (e) {
            console.error("Erro ao inicializar o cliente Supabase:", e.message);
            return res.status(500).json({ error: "Falha na conexão com o banco de dados. Verifique o URL e a Chave de Serviço." });
        }
    }

    let data;
    try {
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
        interesses,
        receber_newsletter,
        receber_eventos,
        termos_aceitos 
    } = data;
    
    // ... Validações (continuam aqui)
    if (!nome || !email || !senha || !rawCpf || !termos_aceitos) {
        return res.status(400).json({ error: "Campos obrigatórios (Nome, E-mail, Senha, CPF, Termos) não preenchidos." });
    }
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "O formato do e-mail é inválido." });
    }
    if (senha.length < 6) {
        return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
    }
    const cleanCpf = rawCpf.replace(/\D/g, ''); 
    if (!isValidCPF(cleanCpf)) {
        return res.status(400).json({ error: "O CPF fornecido é inválido. Por favor, verifique." });
    }

    let interessesArray = null;
    if (interesses && typeof interesses === 'string' && interesses.trim() !== '') {
        interessesArray = interesses.split(',').map(s => s.trim()).filter(s => s.length > 0);
        if (interessesArray.length === 0) {
             interessesArray = null;
        }
    }

    let authUser = null;
    let authError = null;

    // =========================================================
    // 4. PASSO CRUCIAL: CRIA O USUÁRIO NO SISTEMA DE AUTENTICAÇÃO
    // =========================================================
    try {
        // O Supabase Auth faz o hashing da senha e armazena.
        const { data: authData, error } = await supabase.auth.signUp({
            email: email,
            password: senha,
            options: { data: { full_name: nome } }
        });

        authError = error;
        authUser = authData.user;

    } catch (e) {
        console.error('Erro de servidor ao tentar signUp:', e);
        return res.status(500).json({ message: "Falha interna ao criar conta de autenticação." });
    }
    
    if (authError) {
        console.error('Erro de Supabase Auth SignUp:', authError);
        if (authError.message.includes('already registered')) {
            return res.status(409).json({ message: "O e-mail já está cadastrado. Por favor, utilize outro." });
        }
        return res.status(500).json({ message: authError.message || "Erro no serviço de autenticação." });
    }
    
    // Se a confirmação de e-mail estiver ativa, o usuário será criado mas não logado.
    if (!authUser || !authUser.id) {
        return res.status(202).json({ 
            message: "Conta de login criada. Verifique seu e-mail para confirmar o cadastro e, em seguida, faça o login.", 
            email: email 
        });
    }

    // ========================================================
    // 5. INSERE O PERFIL NO BANCO DE DADOS USANDO O NOVO ID
    // ========================================================
    const cadastroData = {
        // CHAVE ESTRANGEIRA OBRIGATÓRIA: Este campo liga à tabela auth.users
        user_id: authUser.id, 
        
        // Mapeamentos de dados de perfil (o resto dos seus dados)
        nome_completo: nome,
        email: email,
        // NÃO SALVE A SENHA CRIPTOGRAFADA AQUI. Ela está no Auth Service!
        cpf: cleanCpf,
        
        data_nascimento: data_nascimento || null, 
        genero: genero || null,
        
        telefone: telefone ? telefone.replace(/\D/g, '') : null,
        cep: cep ? cep.replace(/\D/g, '') : null,
        logradouro: logradouro || null,
        numero: numero || null,
        bairro: bairro || null,
        cidade: cidade || null,
        estado: estado || null,
        
        interesses: interessesArray, 
        receber_newsletter: receber_newsletter || false,
        receber_eventos: receber_eventos || false,
        termos_aceitos: termos_aceitos, 
    };
    
    const { error: dbError } = await supabase
        .from('cadastro') 
        .insert([cadastroData]);

    if (dbError) {
        console.error('Erro ao inserir perfil na tabela "cadastro":', dbError);
        
        // Se a inserção do perfil falhar, você tem uma conta órfã no Auth.
        return res.status(500).json({ 
            message: "Conta de login criada, mas falha ao salvar dados de perfil. Tente fazer login mais tarde.", 
            details: dbError.message 
        });
    }

    // 6. Resposta de sucesso (Status 201: Created)
    res.status(201).json({ 
        message: "Usuário e perfil cadastrados com sucesso!", 
        user_id: authUser.id 
    });
};
