// api/cadastrar.cjs - CÓDIGO CORRIGIDO (sem node-cpf)
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// Carrega variáveis de ambiente
require('dotenv').config();

// Função de validação de CPF manual (substitui o node-cpf)
function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    
    if (cpf.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cpf)) return false;
    
    // Validação do primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = soma % 11;
    let digito1 = resto < 2 ? 0 : 11 - resto;
    
    if (digito1 !== parseInt(cpf.charAt(9))) return false;
    
    // Validação do segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = soma % 11;
    let digito2 = resto < 2 ? 0 : 11 - resto;
    
    return digito2 === parseInt(cpf.charAt(10));
}

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error('MONGODB_URI não está definida nas variáveis de ambiente');
    process.exit(1);
}

const client = new MongoClient(uri);
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let db = null;

async function connectToDatabase() {
    if (db) return db;
    
    try {
        await client.connect();
        db = client.db("EcoAcessoDB");
        console.log("✅ Conectado ao MongoDB Atlas com sucesso!");
        return db;
    } catch (error) {
        console.error("❌ Falha na conexão com MongoDB Atlas:", error);
        throw new Error("Falha na conexão com o banco de dados.");
    }
}

module.exports = async (req, res) => {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Responder rapidamente para requisições OPTIONS (CORS)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Método não permitido. Use POST.' });
        return;
    }
    
    try {
        const database = await connectToDatabase();
        const collection = database.collection('cadastro');
        
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
        const usuarioExistente = await collection.findOne({ email: data.email.toLowerCase() });
        if (usuarioExistente) {
            res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
            return;
        }

        // 2. Criptografia da Senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(data.senha, salt);

        // 3. Montagem do Documento
        const cadastroDocument = {
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
            email_confirmado: false,
            created_at: new Date(),
            updated_at: new Date()
        };

        // 4. Inserção no MongoDB
        const result = await collection.insertOne(cadastroDocument);
        
        console.log('✅ Usuário cadastrado com ID:', result.insertedId);
        
        // 5. Resposta de sucesso
        res.status(201).json({ 
            success: true,
            message: 'Cadastro realizado com sucesso!',
            user_id: result.insertedId 
        });

    } catch (error) {
        console.error('❌ Erro na Serverless Function:', error);
        res.status(500).json({ 
            success: false,
            error: 'Falha interna no servidor. Tente novamente.' 
        });
    }
};