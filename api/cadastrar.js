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
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(data.senha, salt);
        // --------------------------------------------------

        // 3. Mapeia os dados do formulário para o formato da tabela 'cadastro'
        const cadastroData = {
            nome_completo: data.nome_completo || data.nome,
            email: data.email,
            telefone: data.telefone,
            data_nascimento: data['data-nascimento'] || null, 
            cpf: data.cpf,
            senha_hash: senhaHash, 
            cep: data.cep,
            logradouro: data.logradouro,
            numero: data.numero,
            complemento: data.complemento,
            bairro: data.bairro,
            cidade: data.cidade,
            estado: data.estado,
            termos_aceitos: data.termos_aceitos,
            
            // CORREÇÃO FINAL: As colunas 'receber_newsletter' e 'receber_eventos' 
            // e 'interesses' foram removidas para corresponder ao esquema atual do Supabase.
        };

        // 4. Insere os dados no Supabase
        const { error } = await supabase
            .from('cadastro') 
            .insert([cadastroData]);

        if (error) {
            console.error('Erro no Supabase:', error);
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
        res.status(500).json({ error: 'Falha no processamento da API de cadastro.' });
    }
};
