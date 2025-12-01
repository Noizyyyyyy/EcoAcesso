const { createClient } = require('@supabase/supabase-js');
const { validate } = require('node-cpf'); // <-- CORREÇÃO: Assegura que 'validate' está importado corretamente
const bcrypt = require('bcryptjs');

// Configuração do Supabase (ASSUMIR que estas variáveis estão definidas no ambiente Vercel)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Inicialização do cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Lista de campos obrigatórios que devem ser validados
const requiredFields = [
    'nome', 'email', 'senha', 'cpf', 'telefone', 'data_nascimento', 'cep', 
    'logradouro', 'numero', 'bairro', 'cidade', 'estado', 'termos_aceitos'
];

module.exports = async (req, res) => {
    // A API só deve responder a requisições POST
    if (req.method !== 'POST') {
        res.status(405).json({ message: 'Método não permitido.' });
        return;
    }

    try {
        const data = req.body;
        
        // 1. VERIFICAÇÃO DE DADOS ESSENCIAIS (CHECKLIST)
        for (const field of requiredFields) {
            // Verifica se o campo está ausente, é nulo ou uma string vazia
            if (data[field] === undefined || data[field] === null || (typeof data[field] === 'string' && data[field].trim() === '')) {
                // Termos aceitos é um booleano enviado pelo frontend, mas verificamos seu valor
                if (field === 'termos_aceitos' && data[field] !== true) {
                    res.status(400).json({ error: `O campo 'termos_aceitos' é obrigatório.` });
                    return;
                } else if (field !== 'termos_aceitos') {
                    res.status(400).json({ error: `O campo '${field}' é obrigatório.` });
                    return;
                }
            }
        }
        
        // 2. VALIDAÇÃO DE CPF (ONDE O ERRO OCORREU)
        // A função 'validate' está agora garantida no topo do arquivo (require('node-cpf')).
        if (!validate(data.cpf)) {
            res.status(400).json({ error: 'Falha na validação do CPF.' });
            return;
        }

        // 3. ENCRIPTAR SENHA
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.senha, salt);
        
        // 4. PREPARAR DADOS PARA O BANCO DE DADOS
        const userData = {
            nome: data.nome,
            email: data.email,
            senha: hashedPassword, // Armazena a senha encriptada
            cpf: data.cpf,
            telefone: data.telefone,
            data_nascimento: data.data_nascimento,
            cep: data.cep,
            logradouro: data.logradouro,
            numero: data.numero,
            complemento: data.complemento || null, // Complemento é opcional
            bairro: data.bairro,
            cidade: data.cidade,
            estado: data.estado,
            termos_aceitos: data.termos_aceitos,
            receber_newsletter: data.receber_newsletter || false, // Default para falso se não enviado
        };

        // 5. INSERÇÃO NO SUPABASE
        const { data: user, error: dbError } = await supabase
            .from('usuarios') // Nome da sua tabela de usuários
            .insert([userData])
            .select();

        if (dbError) {
            console.error('Erro no Supabase:', dbError);
            if (dbError.code === '23505') { // Código de erro para violação de unique constraint (ex: CPF ou Email duplicado)
                res.status(409).json({ error: 'Usuário já cadastrado com este E-mail ou CPF.' });
            } else {
                res.status(500).json({ error: 'Erro interno ao salvar dados no banco de dados.' });
            }
            return;
        }

        // 6. RESPOSTA DE SUCESSO
        res.status(201).json({ 
            message: 'Cadastro realizado com sucesso!',
            userId: user[0].id // Retorna o ID do novo usuário
        });

    } catch (error) {
        console.error('Erro fatal na API de Cadastro:', error.message);
        // Responde com status 500 para erros não capturados (como a falha de importação original)
        res.status(500).json({ error: `Falha no processamento da API de cadastro. Detalhe: ${error.message}` });
    }
};
