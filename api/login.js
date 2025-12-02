import { createClient } from '@supabase/supabase-js';

// 1. Variáveis de ambiente
// Use a chave pública (anon key) para operações de autenticação do lado do cliente.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // Chave pública (anon key)

// Expressão Regular para validação de formato de e-mail
const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Declara a variável supabase no escopo do módulo para reutilização
let supabase = null;

// Exporta a função Serverless principal
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

    // Inicializa o cliente Supabase se ainda não foi inicializado
    if (!supabase) {
        try {
            // Usa a chave pública para login
            supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        } catch (e) {
            console.error("Erro ao inicializar o cliente Supabase:", e.message);
            return res.status(500).json({ error: "Falha na conexão com o banco de dados. Verifique o URL e a Chave." });
        }
    }

    let data;
    try {
        data = req.body; 
    } catch (e) {
        return res.status(400).json({ error: "Corpo da requisição deve ser JSON válido." });
    }

    // 3. Extrai e valida os dados de login
    const { email, senha } = data;
    
    // Validação de campos obrigatórios
    if (!email || !senha) {
        return res.status(400).json({ error: "Email e Senha são obrigatórios para o login." });
    }

    // Validação de formato de E-mail
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "O formato do e-mail é inválido." });
    }
    
    // 4. Realiza o Login com o serviço de Autenticação do Supabase
    try {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: senha,
        });

        if (error) {
            console.error('Erro de Supabase Auth Login:', error);

            // Supabase Auth retorna 400 ou 401 para credenciais inválidas.
            return res.status(401).json({ 
                error: "Credenciais inválidas.", 
                message: "Email ou senha incorretos, ou usuário não confirmado.",
                details: error.message
            });
        }
        
        // 5. Resposta de sucesso (Status 200: OK)
        // O token de sessão e os dados do usuário são retornados,
        // permitindo que o cliente armazene a sessão.
        res.status(200).json({ 
            message: "Login realizado com sucesso!", 
            user: authData.user,
            session: authData.session
        });

    } catch (e) {
        console.error('Erro interno do servidor durante o login:', e);
        return res.status(500).json({ error: "Falha interna ao processar o login." });
    }
};
