// Configurações do Supabase (Substitua pelos seus dados)
// Nota: Certifique-se de que sua chave de API seja uma "Chave Anon" ou "Chave de Serviço" com permissão de inserção.
const SUPABASE_URL = 'https://nbumhujecfjmtxgxtcxx.supabase.co'; // Ex: 'https://xyz1234.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idW1odWplY2ZqbXR4Z3h0Y3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMTM0OTAsImV4cCI6MjA3OTg4OTQ5MH0.U_ZwNa4h2Zv8WHA7njSz55G0bC3XteK3wnHwHm0JXv8'; // Chave pública ou de serviço

// Inicialização do cliente Supabase (requer a biblioteca Supabase na sua página HTML)
// No seu index.html: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Função para registrar um novo usuário na tabela 'cadastro'.
 * @param {object} dados - Os dados do cadastro do usuário.
 * @returns {object} Um objeto contendo o usuário inserido ou um erro.
 */
async function cadastrarUsuario(dados) {
    console.log("Iniciando cadastro do usuário...");
    console.log("Dados recebidos:", dados);
    
    // 1. Mapeamento de dados e garantia de campos NOT NULL
    // O CPF e termos_aceitos são OBRIGATÓRIOS (NOT NULL) conforme seu esquema SQL.
    const cadastroData = {
        // Campos NOT NULL (Obrigatórios)
        email: dados.email,
        cpf: dados.cpf, // Adicionado e garantido, pois é NOT NULL
        senha_hash: dados.senhaHash,
        termos_aceitos: true, // Assumindo que o usuário aceitou os termos para chegar aqui (NOT NULL)

        // Campos Opcionais (Permitem NULL)
        nome_completo: dados.nomeCompleto || null,
        telefone: dados.telefone || null,
        data_nascimento: dados.dataNascimento || null,
        cep: dados.cep || null,
        logradouro: dados.logradouro || null,
        numero: dados.numero || null,
        complemento: dados.complemento || null,
        bairro: dados.bairro || null,
        cidade: dados.cidade || null,
        estado: dados.estado || null,
    };
    
    console.log("Dados formatados para inserção:", cadastroData);

    try {
        const { data, error } = await supabaseClient
            .from('cadastro')
            .insert([cadastroData]);

        if (error) {
            console.error("Erro detalhado do Supabase na inserção:", error);
            // Retorna um erro amigável baseado no código do erro (ex: 23505 para duplicidade)
            if (error.code === '23505') {
                // Erro de violação de UNIQUE (cpf ou email já existem)
                return { 
                    success: false, 
                    message: "Cadastro falhou. Este CPF ou E-mail já está em uso.",
                    details: error.message
                };
            }
            return { 
                success: false, 
                message: "Ocorreu um erro desconhecido ao cadastrar.", 
                details: error.message 
            };
        }

        console.log("Usuário cadastrado com sucesso:", data);
        return { 
            success: true, 
            message: "Usuário cadastrado com sucesso!", 
            usuario: data[0] 
        };

    } catch (e) {
        console.error("Exceção geral na função cadastrarUsuario:", e);
        return { 
            success: false, 
            message: "Ocorreu uma falha na comunicação com o servidor.", 
            details: e.message 
        };
    }
}
