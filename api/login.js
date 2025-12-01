import { createClient } from '@supabase/supabase-js';

// IMPORTANTE: Este código usa o sistema de módulos ES (import/export)
// O seu package.json DEVE ter "type": "module" para isso funcionar.

// Variáveis de ambiente (usadas tanto para cadastro quanto para login)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Expressão Regular para validação de formato de e-mail
const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Declara a variável supabase no escopo do módulo para reutilização
let supabase = null;

/**
 * Função Serverless para realizar o Login
 * Verifica e-mail e senha na tabela 'cadastro'.
 */
export default async (req, res) => {
    // 1. Apenas aceite requisições POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Método não permitido. Apenas POST é aceito." });
    }

    // 2. Inicialização e Configuração
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error("ERRO CRÍTICO: Variáveis Supabase ausentes.");
        return res.status(500).json({ error: "Configuração do servidor inválida." });
    }

    if (!supabase) {
        try {
            supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        } catch (e) {
            console.error("Erro ao inicializar o cliente Supabase:", e.message);
            return res.status(500).json({ error: "Falha na conexão com o banco de dados." });
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
    
    if (!email || !senha) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }
    
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "O formato do e-mail é inválido." });
    }

    // 4. Busca o utilizador no Supabase
    try {
        // Puxa APENAS o email e a senha_hash (que contém a senha em texto simples, por enquanto)
        const { data: userData, error } = await supabase
            .from('cadastro') 
            .select('email, senha_hash') // Seleciona apenas os campos necessários
            .eq('email', email)         // Filtra pelo email fornecido
            .single();                  // Espera um único resultado
            
        if (error && error.code !== 'PGRST116') { // PGRST116 é "No rows found"
            console.error('Erro no Supabase durante o login:', error);
            // Evita dar detalhes do erro ao utilizador final por segurança
            return res.status(500).json({ message: "Falha na comunicação com o banco de dados." });
        }
        
        // 5. Verifica se o utilizador foi encontrado
        if (!userData) {
            // Não encontrou o utilizador. Retorna erro genérico por segurança.
            return res.status(401).json({ message: "Credenciais inválidas. Verifique o e-mail e a senha." });
        }
        
        // 6. Compara a senha
        // ***** AQUI DEVERIA SER USADA UMA FUNÇÃO DE COMPARAÇÃO DE HASHES (ex: bcrypt.compare) *****
        // Usamos a comparação direta porque o cadastro está salvando a senha em texto simples.
        const senhaCorreta = userData.senha_hash === senha;
        
        if (senhaCorreta) {
            // Sucesso! O utilizador está autenticado.
            return res.status(200).json({ 
                message: "Login bem-sucedido!", 
                user: { email: userData.email } 
            });
        } else {
            // Senha incorreta.
            return res.status(401).json({ message: "Credenciais inválidas. Verifique o e-mail e a senha." });
        }

    } catch (error) {
        console.error('Erro inesperado no login:', error.message);
        return res.status(500).json({ message: "Ocorreu um erro interno no servidor." });
    }
}
