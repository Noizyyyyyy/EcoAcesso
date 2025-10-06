// **ATENÇÃO: Este deve ser o código final no seu api/cadastrar.js**
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { cpf } from 'node-cpf';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Método não permitido. Use POST.' });
        return;
    }
    try {
        const data = req.body;

        if (!data.email || !data.senha || !data.termos_aceitos || !data.cpf) {
            res.status(400).json({ error: 'Dados essenciais (e-mail, senha, termos e CPF) ausentes.' });
            return;
        }
        if (!emailRegex.test(data.email)) {
            res.status(400).json({ error: 'O formato do e-mail é inválido. Verifique o endereço.' });
            return;
        }
        const cpfLimpo = data.cpf.replace(/\D/g, '');
        if (!cpf.validate(cpfLimpo)) {
            res.status(400).json({ error: 'O CPF fornecido é inválido. Verifique os números.' });
            return;
        }
        
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(data.senha, salt);

        const cadastroData = {
            nome_completo: data.nome_completo || data.nome,
            email: data.email,
            telefone: data.telefone,
            data_nascimento: data['data-nascimento'] || null, 
            cpf: cpfLimpo,
            senha_hash: senhaHash, 
            cep: data.cep,
            logradouro: data.logradouro,
            numero: data.numero,
            complemento: data.complemento,
            bairro: data.bairro,
            cidade: data.cidade,
            estado: data.estado,
            termos_aceitos: data.termos_aceitos,
            
            // O e-mail é considerado confirmado para permitir o cadastro sem verificação
            email_confirmado: true, 
        };

        const { error } = await supabase.from('cadastro').insert([cadastroData]);

        if (error) {
            console.error('Erro no Supabase:', error);
            if (error.code === '23505') {
                 res.status(409).json({ error: 'E-mail ou CPF já cadastrado.' });
            } else {
                 res.status(500).json({ error: 'Erro interno ao salvar os dados.' });
            }
            return;
        }
        
        res.status(201).json({ 
            message: 'Cadastro realizado com sucesso! Redirecionando...', 
            email: data.email
        });

    } catch (e) {
        console.error('Erro na Serverless Function:', e);
        res.status(500).json({ error: 'Falha no processamento da API de cadastro.' });
    }
};
