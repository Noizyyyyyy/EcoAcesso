import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs'; // Importa a biblioteca de hash

// As credenciais do Supabase (lidas das variáveis de ambiente do Vercel)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Inicializa o cliente Supabase.
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// A função handler é o que o Vercel executa.
export default async (req, res) => {
    // 1. Apenas aceita requisições POST
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Método não permitido. Use POST.' });
        return;
    }

    try {
        const data = req.body;

        // Validação básica para campos obrigatórios (além da validação do front-end)
        if (!data.email || !data.senha || !data.termos_aceitos) {
            res.status(400).json({ error: 'Dados essenciais (e-mail, senha e termos) ausentes.' });
            return;
        }

        // --- LÓGICA DE SEGURANÇA CRÍTICA: HASH DA SENHA ---
        // O custo de hash (saltRounds) deve ser de pelo menos 10.
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(data.senha, salt);
        // --------------------------------------------------

        // 3. Mapeia os dados do formulário para o formato da tabela 'cadastros'
        const cadastroData = {
            nome_completo: data.nome,
            email: data.email,
            telefone: data.telefone,
            data_nascimento: data['data-nascimento'] || null, 
            cpf: data.cpf, // <-- AGORA INCLUINDO O CPF
            senha_hash: senhaHash, // <-- SALVANDO O HASH, NÃO A SENHA PURA
            cep: data.cep,
            logradouro: data.logradouro,
            numero: data.numero,
            complemento: data.complemento,
            bairro: data.bairro,
            cidade: data.cidade,
            estado: data.estado,
            termos_aceitos: data.termos_aceitos,
            receber_newsletter: data.receber_newsletter,
            receber_eventos: data.receber_eventos,
            // O campo 'interesses' não está no HTML, mas mantemos o tratamento caso seja adicionado no futuro.
            interesses: data.interesses ? data.interesses.split(',') : [],
        };

        // 4. Insere os dados no Supabase
        const { error } = await supabase
            .from('cadastros')
            .insert([cadastroData]);

        if (error) {
            console.error('Erro no Supabase:', error);
            // Erro 23505 é o código de erro padrão do PostgreSQL para violação de UNIQUE (ex: e-mail duplicado)
            if (error.code === '23505') {
                 res.status(409).json({ error: 'E-mail ou CPF já cadastrado.' });
            } else {
                 res.status(500).json({ error: 'Erro interno ao salvar os dados.' });
            }
            return;
        }

        // 5. Retorna sucesso para o Front-end
        res.status(201).json({ 
            message: 'Cadastro realizado com sucesso!', 
            email: data.email
        });

    } catch (e) {
        console.error('Erro na Serverless Function:', e);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};