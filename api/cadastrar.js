// api/cadastrar.js

// Importa os módulos usando a sintaxe de Módulos ES (import)
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// CORREÇÃO DEFINITIVA: Usa a sintaxe CommonJS (require) para o 'node-cpf'.
// Esta linha substitui a linha problemática 'import { cpf } from "node-cpf";'
const { cpf } = require('node-cpf'); 

// Variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Inicializa o cliente Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async (req, res) => {
    // Garante que é uma requisição POST
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Método não permitido. Use POST.' });
        return;
    }
    
    try {
        const data = req.body;

        // 1. Validação de campos essenciais
        if (!data.email || !data.senha || !data.termos_aceitos || !data.cpf) {
            res.status(400).json({ error: 'Dados essenciais (e-mail, senha, termos e CPF) ausentes.' });
            return;
        }

        // 2. Validação de formato (Email e CPF)
        if (!emailRegex.test(data.email)) {
            res.status(400).json({ error: 'O formato do e-mail é inválido. Verifique o endereço.' });
            return;
        }
        
        // Limpa o CPF e valida
        const cpfLimpo = data.cpf.replace(/\D/g, '');
        if (!cpf.validate(cpfLimpo)) {
            res.status(400).json({ error: 'O CPF fornecido é inválido. Verifique os números.' });
            return;
        }
        
        // 3. Criptografia da Senha (Hashing)
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(data.senha, salt);

        // 4. Montagem dos dados para inserção
        const cadastroData = {
            nome_completo: data.nome_completo || data.nome,
            email: data.email,
            telefone: data.telefone,
            data_nascimento: data['data-nascimento'] || null, 
            cpf: cpfLimpo,
            senha_hash: senhaHash, // Salva a senha criptografada
            cep: data.cep,
            logradouro: data.logradouro,
            numero: data.numero,
            complemento: data.complemento,
            bairro: data.bairro,
            cidade: data.cidade,
            estado: data.estado,
            termos_aceitos: data.termos_aceitos,
            
            email_confirmado: true, 
        };

        // 5. Inserção no Supabase (tabela 'cadastro')
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
        
        // 6. Resposta de sucesso
        res.status(201).json({ 
            message: 'Cadastro realizado com sucesso! Redirecionando...', 
            email: data.email
        });

    } catch (e) {
        // 7. Tratamento de erros gerais
        console.error('Erro na Serverless Function:', e);
        res.status(500).json({ error: 'Falha no processamento da API de cadastro.' });
    }
};