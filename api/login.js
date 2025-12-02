import { createClient } from '@supabase/supabase-js';

// --- ATENÇÃO: USO APENAS PARA PROTÓTIPOS E FEIRAS DE CIÊNCIAS ---
// Esta versão NÃO é segura para uso em produção, pois armazena senhas em texto puro
// na coluna `senha_hash` e as compara diretamente.
// Em um ambiente real, você DEVE usar hash de senha (como bcrypt).

// 1. Variáveis de ambiente (Ajuste para suas variáveis)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; 

// Declara a variável supabase no escopo do módulo para reutilização
let supabase = null;

/**
 * Função principal que será executada ao receber a requisição de login.
 * @param {object} req - Objeto de requisição (contém body com email/password).
 * @param {object} res - Objeto de resposta.
 */
export default async (req, res) => {
    // 2. Inicializa o Supabase Client se ainda não estiver inicializado
    if (!supabase) {
        if (!SUPABASE_URL || !SUPABASE_KEY) {
            console.error("Variáveis de ambiente do Supabase não configuradas.");
            return res.status(500).json({ message: "Configuração do servidor incompleta." });
        }
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    
    // Configura o cabeçalho CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Responde a requisições OPTIONS (pré-voo CORS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido.' });
    }

    // 3. Obtém as credenciais do corpo da requisição
    const { email, password } = req.body;

    // 4. Validação simples
    if (!email || !password) {
        return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
    }

    try {
        // 5. Consulta o Supabase para obter a senha (em texto simples)
        // Busca o valor da coluna 'senha_hash' (que agora armazena o texto puro)
        const { data, error } = await supabase
            .from('cadastro') 
            .select('senha_hash') // Usando o nome da coluna da sua tabela SQL
            .eq('email', email) 
            .single(); 

        if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado
            console.error('Erro na consulta ao Supabase:', error);
            // Evita revelar se o erro foi na base de dados (melhor segurança)
            return res.status(500).json({ message: 'Erro ao verificar credenciais.' });
        }

        // 6. Verifica se o usuário foi encontrado
        if (!data) {
            // Usuário não encontrado
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // A senha armazenada é o texto simples
        const storedPassword = data.senha_hash; 

        // 7. Compara a senha fornecida com a senha armazenada (COMPARAÇÃO DE TEXTO SIMPLES)
        const passwordMatch = (password === storedPassword);

        if (passwordMatch) {
            // 8. Login BEM-SUCEDIDO
            return res.status(200).json({ 
                message: 'Login realizado com sucesso!',
                email: email
            });
        } else {
            // 9. Senha INCORRETA
            // Retorna a mesma mensagem de erro para evitar dar dicas sobre o motivo da falha
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

    } catch (e) {
        console.error('Erro inesperado no login:', e);
        return res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};
