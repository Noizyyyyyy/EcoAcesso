// api/cadastrar.js - SUPABASE VERSION
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Carrega variáveis de ambiente
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL ou SUPABASE_ANON_KEY não configurados');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Função de validação de CPF manual
function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    
    if (cpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpf)) return false;
    
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = soma % 11;
    let digito1 = resto < 2 ? 0 : 11 - resto;
    
    if (digito1 !== parseInt(cpf.charAt(9))) return false;
    
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = soma % 11;
    let digito2 = resto < 2 ? 0 : 11 - resto;
    
    return digito2 === parseInt(cpf.charAt(10));
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Método não permitido. Use POST.' });
        return;
    }
    
    try {
        let data;
        try {
            data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch (parseError) {
            res.status(400).json({ error: 'JSON inválido no corpo da requisição' });
            return;
        }

        console.log('📥 Dados recebidos:', Object.keys(data));

        // 1. Validação de campos essenciais
        if (!data.email || !data.senha || !data.termos) {
            res.status(400).json({ error: 'E-mail, senha e aceitação dos termos são obrigatórios.' });
            return;
        }
        
        // Validação de email
        if (!emailRegex.test(data.email)) {
            res.status(400).json({ error: 'O e-mail fornecido é inválido.' });
            return;
        }
        
        // Validação de CPF (se fornecido)
        if (data.cpf && data.cpf.trim() !== '') {
            const cpfLimpo = data.cpf.replace(/\D/g, '');
            if (cpfLimpo.length === 11 && !validarCPF(cpfLimpo)) {
                res.status(400).json({ error: 'O CPF fornecido é inválido.' });
                return;
            }
        }

        // Verificar se email já existe
        const { data: usuarioExistente, error: buscaError } = await supabase
            .from('usuarios')
            .select('email')
            .eq('email', data.email.toLowerCase())
            .single();

        if (usuarioExistente) {
            res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
            return;
        }

        // 2. Criptografia da Senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(data.senha, salt);

        // 3. Montagem dos dados para inserção
        const usuarioData = {
            nome_completo: data.nome || '',
            email: data.email.toLowerCase(), 
            telefone: data.telefone || '',
            data_nascimento: data['data-nascimento'] || null, 
            cpf: data.cpf ? data.cpf.replace(/\D/g, '') : null,
            senha_hash: senhaHash,
            cep: data.cep || '',
            logradouro: data.logradouro || '',
            numero: data.numero || '',
            complemento: data.complemento || '',
            bairro: data.bairro || '',
            cidade: data.cidade || '',
            estado: data.estado || '',
            termos_aceitos: true,
            email_confirmado: false
        };

        // 4. Inserção no Supabase
        const { data: novoUsuario, error: insertError } = await supabase
            .from('usuarios')
            .insert([usuarioData])
            .select()
            .single();

        if (insertError) {
            console.error('❌ Erro ao inserir no Supabase:', insertError);
            res.status(500).json({ 
                success: false,
                error: 'Erro ao cadastrar usuário no banco de dados.' 
            });
            return;
        }

        console.log('✅ Usuário cadastrado com ID:', novoUsuario.id);
        
        // 5. Resposta de sucesso
        res.status(201).json({ 
            success: true,
            message: 'Cadastro realizado com sucesso!',
            user_id: novoUsuario.id 
        });

    } catch (error) {
        console.error('❌ Erro na Serverless Function:', error);
        res.status(500).json({ 
            success: false,
            error: 'Falha interna no servidor. Tente novamente.' 
        });
    }
};