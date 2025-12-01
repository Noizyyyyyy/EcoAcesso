import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs'; // Importação do bcryptjs é NECESSÁRIA

// 1. Variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
let supabase = null;

export default async (req, res) => {
    // ... [Passos de validação e inicialização do Supabase (1, 2, 3)] ...
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Método não permitido. Apenas POST é aceito." });
    }
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error("ERRO CRÍTICO DE CONFIGURAÇÃO: As variáveis SUPABASE_URL ou SUPABASE_KEY não foram encontradas.");
        return res.status(500).json({ error: "Configuração do servidor inválida. Chaves da base de dados ausentes." });
    }
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
        data = req.body;
    } catch (e) {
        return res.status(400).json({ error: "Corpo da requisição deve ser JSON válido." });
    }

    const { email, senha } = data;

    if (!email || !senha) {
        return res.status(400).json({ error: "E-mail e senha são campos obrigatórios para o login." });
    }
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "O formato do e-mail é inválido." });
    }
    // ... [Fim dos passos iniciais] ...


    // 4. Busca o usuário (buscando o nome e a senha_hash)
    const { data: userData, error: fetchError } = await supabase
        .from('cadastro')
        .select('nome_completo, senha_hash') // Busca a senha E outros dados que você possa querer retornar
        .eq('email', email)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Erro ao buscar usuário no Supabase:', fetchError);
        return res.status(500).json({ message: "Ocorreu um erro ao tentar fazer login. Tente novamente." });
    }

    // 5. Verifica se o usuário foi encontrado
    if (!userData) {
        return res.status(401).json({ message: "E-mail ou senha inválidos." });
    }

    // 6. COMPARAÇÃO SEGURA DE SENHA USANDO BCRYPT
    let passwordMatch = false;
    try {
        // Compara a senha em texto simples com o hash armazenado no DB
        passwordMatch = await bcrypt.compare(senha, userData.senha_hash);
    } catch (e) {
        console.error("Erro ao comparar hash de senha:", e.message);
        // Se a senha no DB não for um hash válido, isso pode falhar.
        return res.status(401).json({ message: "E-mail ou senha inválidos." }); 
    }


    if (passwordMatch) {
        // Sucesso no login
        res.status(200).json({ 
            message: "Login realizado com sucesso!", 
            email: email,
            nome: userData.nome_completo // Exemplo de retorno de dado
        });
    } else {
        // Senha não coincide
        return res.status(401).json({ message: "E-mail ou senha inválidos." });
    }
};
