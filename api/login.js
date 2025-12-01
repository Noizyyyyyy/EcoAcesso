// Configuração do Supabase (Assumindo que você tem as variáveis de ambiente aqui)
import { createClient } from '@supabase/supabase-js';

// Preencha com suas chaves (ou use variáveis de ambiente)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para fazer o tratamento de erros assíncrono
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
        const { data: userData, error: fetchError } = await supabase
            .from('cadastro')
            .select('nome_completo, senha_hash') 
            .eq('email', email)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = não encontrou
            // Erro de comunicação com o DB
            console.error('Erro ao buscar usuário:', fetchError.message);
            return res.status(500).json({ message: "Erro interno do servidor." });
        }

        if (!userData) {
            return res.status(401).json({ message: "E-mail ou senha incorretos." });
        }

        // 2. Prepara as senhas para comparação
        
        // A senha vinda do DB (senha_hash) deve ser tratada. Usamos .trim() para remover espaços.
        const passwordDB = userData.senha_hash ? userData.senha_hash.trim() : '';
        
        // A senha vinda do input do usuário também deve ser tratada.
        const passwordInput = senha.trim();

        // 3. DEBUG CRÍTICO:
        // ESTAS LINHAS SÃO ESSENCIAIS PARA IDENTIFICAR A CAUSA DO ERRO NO SEU LOG.
        console.log(`[DEBUG] Senha Input (Trimmed): "${passwordInput}"`);
        console.log(`[DEBUG] Senha DB (Trimmed): "${passwordDB}"`);
        
        // 4. Comparação
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
            // Falha na comparação da senha
            return res.status(401).json({ message: "E-mail ou senha incorretos." });
        }

    } catch (error) {
        console.error('Erro desconhecido no login:', error);
        return res.status(500).json({ message: "Erro interno do servidor." });
    }
};

export default handler;
