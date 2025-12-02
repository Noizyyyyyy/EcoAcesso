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
// 2. REFERÊNCIAS AO DOM E CONFIGURAÇÃO
// AQUI VOCÊ DEVE CONFIGURAR OS IDs DOS SEUS ELEMENTOS HTML
// =========================================================================
const form = document.getElementById('signup-form'); // ID do seu formulário
const messageArea = document.getElementById('message-area'); // ID da área para mensagens de feedback
const submitButton = document.getElementById('submit-button'); // ID do seu botão de submissão
const emailInput = document.getElementById('email'); // ID do campo de E-mail
const passwordInput = document.getElementById('password'); // ID do campo de Senha

// URL para onde redirecionar após o login bem-sucedido
const DASHBOARD_URL = 'dashboard.html'; 

// =========================================================================
// 3. FUNÇÕES AUXILIARES
// =========================================================================

/**
 * Exibe uma mensagem de feedback na interface.
 * @param {string} text - O texto da mensagem a ser exibida.
 * @param {boolean} isError - Se a mensagem é um erro.
 */
function showMessage(text, isError = false) {
    if (!messageArea) return;

    messageArea.textContent = text;
    // Remove todas as classes de estado
    messageArea.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700');
    
    if (isError) {
        messageArea.classList.add('bg-red-100', 'text-red-700');
    } else {
        messageArea.classList.add('bg-green-100', 'text-green-700');
    }
}

/**
 * Tenta fazer o login com as credenciais e redireciona.
 * @param {string} email - O e-mail do usuário.
 * @param {string} password - A senha do usuário.
 */
async function signInUser(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        console.error('Erro no Login Imediato:', error);
        // Se houver falha de login, exibe o erro e sugere login manual
        showMessage(`Registo OK, mas falha no login automático: ${error.message}.`, true);
    } else {
        // Redireciona o usuário
        showMessage('Registo e Login Automático OK! Redirecionando...', false);
        setTimeout(() => {
            window.location.href = DASHBOARD_URL; 
        }, 800);
    }
}

// =========================================================================
// 4. LÓGICA DE REGISTRO PRINCIPAL
// =========================================================================

/**
 * Lida com o evento de submissão do formulário.
 */
async function handleSignUp(event) {
    event.preventDefault();

    // Verificação inicial dos elementos DOM
    if (!form || !messageArea || !submitButton || !emailInput || !passwordInput) {
        console.error("ERRO: Um ou mais elementos DOM necessários não foram encontrados. Verifique seus IDs.");
        return;
    }

    // Desabilita o botão e mostra que está processando
    submitButton.disabled = true;
    submitButton.textContent = 'A Processar...';
    messageArea.classList.add('hidden');

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Verificação de segurança de configuração
    if (SUPABASE_URL.includes('SUA_URL') || SUPABASE_ANON_KEY.includes('SUA_CHAVE')) {
         showMessage('ERRO DE CONFIGURAÇÃO: Por favor, substitua os placeholders de URL e Chave ANÔNIMA no arquivo cadastro.js.', true);
         submitButton.disabled = false;
         submitButton.textContent = 'Registrar e Entrar';
         return;
    }

    try {
        // 1. Tenta Registrar o Usuário
        const { data, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: password
        });

        if (signUpError) {
            console.error('Erro de Registo:', signUpError);
            showMessage(`Erro ao registrar: ${signUpError.message}.`, true);
        } else {
            // 2. Se o Registro foi bem-sucedido, tenta fazer o Login Imediato
            // ESTA É A PARTE QUE SÓ FUNCIONA COM "EMAIL CONFIRMATIONS" DESATIVADO.
            
            // O Supabase retorna `data.session` se a confirmação estiver desligada e o login automático for bem-sucedido.
            if (data.session) {
                showMessage('Registo bem-sucedido e login automático OK! Redirecionando...', false);
                 setTimeout(() => {
                    window.location.href = DASHBOARD_URL; 
                 }, 800);
            } else {
                // Se a confirmação estiver ligada, o Supabase envia o e-mail, mas não retorna a sessão.
                showMessage(
                    'Registo OK! A confirmação por e-mail está ATIVA. Verifique sua caixa de entrada.',
                    false
                );
            }
            
            form.reset();
        }

    } catch (err) {
        console.error('Erro geral inesperado:', err);
        showMessage('Ocorreu um erro inesperado. Tente novamente.', true);
    } finally {
        // Restaura o botão apenas se não houver redirecionamento imediato
        if (window.location.href.includes('registro.html')) {
            submitButton.disabled = false;
            submitButton.textContent = 'Registrar e Entrar';
        }
    }
}

// =========================================================================
// 5. EVENT LISTENERS
// =========================================================================

// Adiciona o listener ao formulário
// Adicione um listener DOMContentLoaded para garantir que os elementos já existem
document.addEventListener('DOMContentLoaded', () => {
    if (form) {
        form.addEventListener('submit', handleSignUp);
    } else {
        console.error("ERRO: O formulário com ID 'signup-form' não foi encontrado.");
    }
});
