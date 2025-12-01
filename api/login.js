// Configuração do Supabase (Assumindo que você tem as variáveis de ambiente aqui)
import { createClient } from '@supabase/supabase-js';

// Preencha com suas chaves (ou use variáveis de ambiente)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

// Função auxiliar para converter strings para Hexadecimal, revelando caracteres invisíveis
const stringToHex = (str) => {
    if (!str) return 'NULO/VAZIO';
    return Array.from(str)
        .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(' ');
};

// Função principal do handler
const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido.' });
    }

    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ message: "E-mail e senha são obrigatórios." });
    }

    try {
        // 1. Busca o usuário
        // NOTA: É fundamental que 'senha_hash' seja o nome correto da coluna
        const { data: userData, error: fetchError } = await supabase
            .from('cadastro')
            .select('nome_completo, senha_hash') 
            .eq('email', email)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = não encontrou
            console.error('Erro ao buscar usuário (DB):', fetchError.message);
            return res.status(500).json({ message: "Erro interno do servidor." });
        }

        if (!userData || !userData.senha_hash) {
            return res.status(401).json({ message: "E-mail ou senha incorretos." });
        }

        // 2. Prepara as senhas para comparação
        
        // Aplica .trim() para remover espaços em branco iniciais/finais
        const passwordDB = userData.senha_hash.trim();
        const passwordInput = senha.trim();

        // 3. DEBUG CRÍTICO COM REPRESENTAÇÃO HEXADECIMAL:
        console.log(`--- DEBUG LOGIN ---`);
        console.log(`[Input] Senha (Original): "${senha}"`);
        console.log(`[DB] Senha (Original): "${userData.senha_hash}"`);

        console.log(`[Input] Senha (Trimmed): "${passwordInput}"`);
        console.log(`[DB] Senha (Trimmed): "${passwordDB}"`);
        
        // O CÓDIGO HEXADECIMAL É A CHAVE PARA REVELAR CARACTERES INVISÍVEIS
        console.log(`[Input] Senha (HEX): ${stringToHex(passwordInput)}`);
        console.log(`[DB] Senha (HEX): ${stringToHex(passwordDB)}`);
        
        console.log(`-------------------`);

        // 4. Comparação ESTREITA (Caso e caracteres importam)
        const passwordMatch = (passwordInput === passwordDB);

        if (passwordMatch) {
            // Sucesso
            return res.status(200).json({ 
                message: "Login bem-sucedido!",
                user: {
                    email: email,
                    nome: userData.nome_completo
                }
            });
        } else {
            // Falha na comparação da senha (Verifique o log HEX!)
            return res.status(401).json({ message: "E-mail ou senha incorretos." });
        }

    } catch (error) {
        console.error('Erro desconhecido no login:', error);
        return res.status(500).json({ message: "Erro interno do servidor." });
    }
};

export default handler;
