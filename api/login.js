import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ==========================================================
// 1. CONFIGURAÇÃO INICIAL (Substitua pelos valores reais)
// ==========================================================

// Variáveis globais do Canvas (ou defina como placeholders se estiver fora)
const SUPABASE_URL = "https://nbumhujecfjmtxgxtcxx.supabase.co"; // Substitua pela sua URL do Supabase
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idW1odWplY2ZqbXR4Z3h0Y3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMTM0OTAsImV4cCI6MjA3OTg4OTQ5MH0.U_ZwNa4h2Zv8WHA7njSz55G0bC3XteK3wnHwHm0JXv8"; // Substitua pela sua Chave Anon do Supabase

// Se o ambiente Canvas fornecer variáveis, use-as
const supabaseUrl = typeof __supabase_url !== 'undefined' ? __supabase_url : SUPABASE_URL;
const supabaseAnonKey = typeof __supabase_anon_key !== 'undefined' ? __supabase_anon_key : SUPABASE_KEY;

// Inicializa o cliente Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==========================================================
// 2. ELEMENTOS DO DOM
// ==========================================================
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');
const statusMessage = document.getElementById('status-message');
const currentUserElement = document.getElementById('current-user-id');

// Elementos de Feedback do Botão
const btnText = document.getElementById('btnText');
const btnLoading = document.getElementById('btnLoading');
const btnSuccess = document.getElementById('btnSuccess');

// Elementos de Mensagem
const errorMessageDiv = document.getElementById('errorMessage');
const errorDetailsP = document.getElementById('errorDetails');
const successMessageDiv = document.getElementById('successMessage');

// ==========================================================
// 3. FUNÇÕES DE UTILIDADE E INTERFACE
// ==========================================================

/**
 * Exibe uma mensagem de erro na interface.
 * @param {string} message - A mensagem de erro a ser exibida.
 */
function displayError(message) {
    errorMessageDiv.style.display = 'block';
    errorDetailsP.textContent = message;
    successMessageDiv.style.display = 'none';
}

/**
 * Atualiza o estado visual do botão de login.
 * @param {string} state - 'ready', 'loading', 'success', 'error'
 */
function updateButtonState(state) {
    loginButton.disabled = true; // Desabilita por padrão ao mudar o estado

    btnLoading.style.display = 'none';
    btnSuccess.style.display = 'none';
    btnText.textContent = '';
    
    // Esconde as mensagens ao mudar o estado
    errorMessageDiv.style.display = 'none';
    successMessageDiv.style.display = 'none';

    switch (state) {
        case 'ready':
            loginButton.disabled = false;
            btnText.textContent = 'Entrar';
            break;
        case 'loading':
            btnLoading.style.display = 'inline-block';
            btnText.textContent = 'Autenticando...';
            break;
        case 'success':
            btnSuccess.style.display = 'inline-block';
            btnText.textContent = 'Sucesso!';
            break;
        case 'error':
            loginButton.disabled = false;
            btnText.textContent = 'Tentar Novamente';
            break;
        case 'initializing':
        default:
            btnText.textContent = 'Aguardando Inicialização...';
            break;
    }
}

// ==========================================================
// 4. LÓGICA DE AUTENTICAÇÃO
// ==========================================================

/**
 * Função principal para lidar com o login do usuário.
 * @param {Event} event - O evento de submissão do formulário.
 */
async function handleLogin(event) {
    event.preventDefault(); // Impede o envio padrão do formulário

    updateButtonState('loading');

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Validação básica
    if (!email || !password) {
        displayError('Por favor, preencha o e-mail e a senha.');
        updateButtonState('error');
        return;
    }

    try {
        // 1. Chama o método signInWithPassword do Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            // Se houver um erro, lança para o bloco catch
            throw new Error(error.message);
        }

        // 2. Login bem-sucedido
        updateButtonState('success');
        successMessageDiv.style.display = 'block';
        
        console.log('Login bem-sucedido:', data.user);
        currentUserElement.textContent = data.user.id;

        // 3. Redirecionamento após o sucesso
        setTimeout(() => {
            // Redirecione para a página principal (ou painel do usuário)
            window.location.href = '/dashboard.html'; // Altere conforme necessário
        }, 1500);

    } catch (error) {
        console.error('Erro durante o login:', error.message);
        
        // Mapeia mensagens de erro comuns para serem amigáveis ao usuário
        let userFriendlyMessage = 'Ocorreu um erro desconhecido.';
        
        if (error.message.includes('Invalid login credentials')) {
            userFriendlyMessage = 'Credenciais inválidas. Verifique seu e-mail e senha.';
        } else if (error.message.includes('Email not confirmed')) {
            userFriendlyMessage = 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.';
        } else {
            userFriendlyMessage = `Erro: ${error.message}`;
        }

        displayError(userFriendlyMessage);
        updateButtonState('error');
    }
}

// ==========================================================
// 5. REGISTRO DE EVENTOS E INICIALIZAÇÃO
// ==========================================================

// Adiciona o listener para a submissão do formulário
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}

// Habilita o botão apenas quando ambos os campos estiverem preenchidos
function checkFormValidity() {
    const emailValid = emailInput.value.trim().length > 0;
    const passwordValid = passwordInput.value.trim().length > 0;
    
    if (emailValid && passwordValid) {
        updateButtonState('ready');
    } else {
        updateButtonState('initializing'); // Mantém o estado de inicialização/aguardando
    }
}

// Adiciona listeners para os campos de entrada
emailInput.addEventListener('input', checkFormValidity);
passwordInput.addEventListener('input', checkFormValidity);


// Escuta as mudanças de estado de autenticação (opcional, mas bom para interface)
supabase.auth.onAuthStateChange((event, session) => {
    console.log(`Supabase Auth Event: ${event}`);
    
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Quando o Supabase é inicializado, habilita o botão (se os campos estiverem preenchidos)
        checkFormValidity();
        statusMessage.textContent = 'Serviço de autenticação pronto.';
    }

    if (session) {
        currentUserElement.textContent = session.user.id;
        console.log('Usuário logado:', session.user);
    } else {
        currentUserElement.textContent = 'Nenhum';
    }
});

// Inicializa o estado do botão
updateButtonState('initializing');
