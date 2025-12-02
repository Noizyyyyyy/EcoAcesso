import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// 1. Variáveis de ambiente
// IMPORTANTE: Use a URL e a chave de serviço (service_key) do Supabase para segurança
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // Chave de serviço (service_role)
const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_muito_segura'; // Chave secreta para assinar o token

// 2. Inicialização do Supabase
let supabase = null;
try {
    // Para autenticação e manipulação de usuários, a chave de serviço é preferível para o backend.
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) {
    console.error("Erro ao inicializar Supabase. Verifique as credenciais.");
}

/**
 * Endpoint de Login
 * @param {object} req - O objeto de requisição (contém e-mail e senha no body).
 * @param {object} res - O objeto de resposta.
 */
export default async function loginHandler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido.' });
    }

    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
    }

    if (!supabase) {
        return res.status(500).json({ message: 'Falha na conexão com o banco de dados.' });
    }

    try {
        // 3. Autenticação via Supabase Auth
        // Nota: O Supabase lida com o hashing e a comparação da senha internamente.
        const { data, error } = await supabase.auth.signInWithPassword({ 
            email: email, 
            password: senha 
        });

        if (error) {
            console.error("Erro na autenticação Supabase:", error);
            // 401 Unauthorized para credenciais inválidas
            return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
        }
        
        // Se a autenticação foi bem-sucedida (data.user existe)
        const user = data.user;
        
        // 4. Gera um JWT para manter o estado de login no frontend (opcional, mas boa prática)
        const payload = {
            id: user.id,
            email: user.email,
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); 

        // 5. Retorna sucesso e o token para o frontend
        return res.status(200).json({ 
            message: 'Login realizado com sucesso.',
            token: token,
            user_id: user.id
        });

    } catch (error) {
        console.error('Erro interno do servidor:', error);
        return res.status(500).json({ message: 'Erro interno do servidor.' });
    }
}
