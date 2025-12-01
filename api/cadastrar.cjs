const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { cpf } = require('node-cpf');

// Variáveis de ambiente
// IMPORTANTE: Se o seu ambiente de execução (ex: Vercel) usa SUPABASE_KEY, certifique-se de que o nome da variável está correto.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; 

// --- VERIFICAÇÃO CRÍTICA DE CONFIGURAÇÃO ---
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("ERRO CRÍTICO: Chaves do Supabase ausentes. Verifique as Variáveis de Ambiente.");
    module.exports = (req, res) => {
        res.status(500).json({ error: "Configuração do servidor inválida. As chaves da base de dados não foram encontradas." });
    };
    return;
}

// Inicializa o cliente Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Expressão Regular para validação básica de formato de e-mail
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


module.exports = async (req, res) => { // Use module.exports para Serverless Function em .cjs
    // 1. Apenas aceita requisições POST
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Método não permitido. Use POST.' });
        return;
    }

    try {
        const data = req.body;

        // Validação de campos obrigatórios
        // Os campos 'nome', 'email', 'senha', 'cpf' e 'termos_aceitos' são verificados.
        if (!data.nome || !data.email || !data.senha || !data.termos_aceitos || !data.cpf) {
            // Adicionei 'nome' de volta à verificação para garantir que o formulário está preenchido
            res.status(400).json({ error: 'Dados essenciais (nome, e-mail, senha, termos e CPF) ausentes ou vazios.' });
            return;
        }

        // --- VALIDAÇÃO DE FORMATO DE E-MAIL ---
        if (!emailRegex.test(data.email)) {
            res.status(400).json({ error: 'O formato do e-mail é inválido. Verifique o endereço.' });
            return;
        }

        // --- VALIDAÇÃO DE CPF (Estrutural) ---
        const cpfLimpo = data.cpf.replace(/\D/g, ''); // Remove formatação (pontos/traços)
        
        if (!cpf.validate(cpfLimpo)) {
            res.status(400).json({ error: 'O CPF fornecido é inválido. Verifique os números.' });
            return;
        }
        
        // --- LÓGICA DE SEGURANÇA CRÍTICA: HASH DA SENHA ---
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(data.senha, salt);

        // --- TRATAMENTO DE INTERESSES (String para Array) ---
        let interessesArray = null;
        if (data.interesses && typeof data.interesses === 'string' && data.interesses.trim() !== '') {
            // Converte a string separada por vírgulas em array
            interessesArray = data.interesses.split(',').map(s => s.trim()).filter(s => s.length > 0);
            if (interessesArray.length === 0) {
                 interessesArray = null;
            }
        }

        // 3. Mapeia os dados do formulário para o formato da tabela 'cadastro'
        const cadastroData = {
            // NOME: O campo no front-end é 'nome', mapeamos para 'nome_completo' no DB
            nome_completo: data.nome, 
            email: data.email,
            
            // DADOS PESSOAIS
            cpf: cpfLimpo, // Salva o CPF sem formatação
            senha_hash: senhaHash, 
            data_nascimento: data.data_nascimento || null, // CORRIGIDO para 'data_nascimento' (underscore)
            genero: data.genero || null,
            telefone: data.telefone ? data.telefone.replace(/\D/g, '') : null,
            
            // ENDEREÇO
            cep: data.cep ? data.cep.replace(/\D/g, '') : null,
            logradouro: data.logradouro || null,
            numero: data.numero || null,
            bairro: data.bairro || null,
            cidade: data.cidade || null,
            estado: data.estado || null,
            
            // PREFERÊNCIAS E TERMOS
            interesses: interessesArray, // Array ou null
            receber_newsletter: data.receber_newsletter || false,
            receber_eventos: data.receber_eventos || false,
            termos_aceitos: data.termos_aceitos,
            
            // Campo padrão
            email_confirmado: true, 
        };

        // 4. Insere os dados no Supabase
        const { error } = await supabase
            .from('cadastro') 
            .insert([cadastroData]);

        if (error) {
            console.error('Erro no Supabase:', error);
            // Trata erros de E-mail/CPF duplicado (código 23505)
            if (error.code === '23505') {
                 res.status(409).json({ error: 'E-mail ou CPF já cadastrado.' });
            } else {
                 // Esta mensagem de erro será vista no frontend se o código estiver bom
                 res.status(500).json({ error: error.message || 'Erro interno ao salvar os dados. Verifique RLS e Logs.' });
            }
            return;
        }
        
        // 5. Retorna sucesso para o Front-end
        res.status(201).json({ 
            message: 'Cadastro realizado com sucesso! Redirecionando...', 
            email: data.email
        });

    } catch (e) {
        console.error('Erro na Serverless Function (Try/Catch):', e.message);
        res.status(500).json({ error: `Falha no processamento da API de cadastro. Detalhe: ${e.message}` });
    }
};
