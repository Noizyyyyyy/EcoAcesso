// =========================================================================
// 1. CONFIGURAÇÃO DO SUPABASE
// IMPORTANTE: Você deve substituir estas chaves pelas suas chaves reais do Supabase!
// Elas podem ser encontradas nas configurações do seu projeto Supabase (Settings -> API)
// =========================================================================
const SUPABASE_URL = 'https://nbumhujecfjmtxgxtcxx.supabase.co'; // Ex: https://abcdefg1234.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idW1odWplY2ZqbXR4Z3h0Y3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMTM0OTAsImV4cCI6MjA3OTg4OTQ5MH0.U_ZwNa4h2Zv8WHA7njSz55G0bC3XteK3wnHwHm0JXv8'; // Ex: eyJhbGciOiJIUzI1NiI...

// Inicializa o cliente Supabase (usa o objeto 'supabase' globalmente injetado pelo script na tag HTML)
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================================================
// 2. REFERÊNCIAS AO DOM
// =========================================================================
const form = document.getElementById('signup-form');
const messageArea = document.getElementById('message-area');
const submitButton = document.getElementById('submit-button');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

// =========================================================================
// 3. FUNÇÕES AUXILIARES
// =========================================================================

/**
 * Exibe uma mensagem de feedback na interface.
 * @param {string} text - O texto da mensagem a ser exibida.
 * @param {boolean} isError - Se a mensagem é um erro (usa cores vermelhas) ou sucesso (usa cores verdes).
 */
function showMessage(text, isError = false) {
    messageArea.textContent = text;
    // Remove todas as classes de estado e esconde/mostra conforme necessário
    messageArea.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700');
    
    if (isError) {
        messageArea.classList.add('bg-red-100', 'text-red-700');
    } else {
        messageArea.classList.add('bg-green-100', 'text-green-700');
    }
}

// =========================================================================
// 4. LÓGICA DE REGISTRO
// =========================================================================

/**
 * Lida com o evento de submissão do formulário, realiza o registro no Supabase e gerencia o feedback visual.
 * @param {Event} event - O objeto de evento de submissão.
 */
async function handleSignUp(event) {
    event.preventDefault(); // Impede o recarregamento da página

    // Desabilita o botão e mostra que está processando
    submitButton.disabled = true;
    submitButton.textContent = 'A Processar...';
    messageArea.classList.add('hidden'); // Esconde a mensagem anterior

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showMessage('Por favor, preencha o e-mail e a senha.', true);
        submitButton.disabled = false;
        submitButton.textContent = 'Registrar e Enviar Confirmação';
        return;
    }

    try {
        // Chama a API de autenticação do Supabase.
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                // URL de redirecionamento após o clique no link do e-mail (usamos o domínio atual)
                emailRedirectTo: window.location.origin 
            }
        });

        if (error) {
            // Trata erros da API
            console.error('Erro de Registro:', error);
            showMessage(`Erro ao registrar: ${error.message}.`, true);
        } else if (data.user && !data.session) {
            // Sucesso: O usuário foi criado, mas a sessão não foi iniciada (confirmação por e-mail pendente)
            showMessage(
                'Sucesso! Verifique a sua caixa de e-mail (e a pasta de SPAM) para o link de confirmação.',
                false
            );
            // Limpa o formulário após o sucesso
            form.reset();
        } else {
             // Caso a confirmação por e-mail não esteja ativada no Supabase.
             showMessage('Sucesso no registro e login!', false);
        }

    } catch (err) {
        console.error('Erro geral inesperado:', err);
        showMessage('Ocorreu um erro inesperado. Tente novamente.', true);
    } finally {
        // Restaura o botão
        submitButton.disabled = false;
        submitButton.textContent = 'Registrar e Enviar Confirmação';
    }
}

// =========================================================================
// 5. EVENT LISTENERS
// =========================================================================

// Adiciona o listener ao formulário
form.addEventListener('submit', handleSignUp);
