// api/cadastrar.cjs - CÓDIGO FINAL PARA MONGODB ATLAS

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const { cpf } = require('node-cpf'); 

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Variável para armazenar a conexão persistente
let db = null;

async function connectToDatabase() {
    // Retorna a conexão existente se já estiver ativa
    if (db) return db;
    
    // Conecta se não houver conexão
    try {
        await client.connect();
        db = client.db("EcoAcessoDB"); // <-- Nome do banco de dados que definimos
        return db;
    } catch (error) {
        console.error("Falha na conexão com MongoDB Atlas:", error);
        throw new Error("Falha na conexão com o banco de dados.");
    }
}

module.exports = async (req, res) => {
    
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Método não permitido. Use POST.' });
        return;
    }
    
    try {
        // Conecta ao banco de dados no início de cada execução
        const database = await connectToDatabase();
        const collection = database.collection('cadastro'); // Nome da sua coleção/tabela
        
        const data = req.body;

        // 1. Validação de campos essenciais
        if (!data.email || !data.senha || !data.termos_aceitos || !data.cpf) {
            res.status(400).json({ error: 'Dados essenciais (e-mail, senha, termos e CPF) ausentes.' });
            return;
        }
        
        // ... (Validação de CPF e Email) ...
        const cpfLimpo = data.cpf.replace(/\D/g, '');
        if (!cpf.validate(cpfLimpo)) {
            res.status(400).json({ error: 'O CPF fornecido é inválido.' });
            return;
        }

        // 2. Criptografia da Senha (Hashing)
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(data.senha, salt);

        // 3. Montagem do Documento (JSON)
        const cadastroDocument = {
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
            email_confirmado: true, 
            created_at: new Date()
        };

        // 4. Inserção no MongoDB
        const result = await collection.insertOne(cadastroDocument);
        
        // 5. Resposta de sucesso
        res.status(201).json({ 
            message: 'Cadastro realizado com sucesso com MongoDB Atlas!',
            user_id: result.insertedId 
        });

    } catch (e) {
        console.error('Erro na Serverless Function com MongoDB Atlas:', e);
        res.status(500).json({ error: 'Falha no processamento da API de cadastro.' });
    }
};
