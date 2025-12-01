import React, { useState } from 'react';
import { LogIn, User, Lock, Loader2, LogOut, XCircle } from 'lucide-react';

// Variável global fornecida pelo ambiente para a chave da API (deve ser vazia)
const API_KEY = ""; 

const App = () => {
  // 1. Estados para o formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 2. Estados para a autenticação e feedback do usuário
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 3. URLs do Backend
  const LOGIN_API_URL = '/api/login';
  const LOGOUT_API_URL = '/api/logout'; // Assumindo que você terá um endpoint de logout

  // Função para lidar com o login
  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    if (!email || !password) {
      setMessage('Por favor, preencha todos os campos.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(LOGIN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // O password VAZIO estava vindo daqui! Garantimos que o estado está sendo enviado.
        },
        body: JSON.stringify({ email, password }), 
      });

      const data = await response.json();

      if (!response.ok) {
        // Captura o erro 'Invalid login credentials' e outros erros 4xx
        setMessage(data.error || 'Falha na autenticação. Verifique suas credenciais.');
        setIsLoggedIn(false);
        setUser(null);
      } else {
        setMessage('Login bem-sucedido!');
        setIsLoggedIn(true);
        setUser(data.user);
        // Limpa a senha após o sucesso
        setPassword('');
      }
    } catch (error) {
      console.error('Erro de rede ao tentar logar:', error);
      setMessage('Erro de rede. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para lidar com o logout (simulada, pois depende do endpoint de logout)
  const handleLogout = () => {
    // Em um app real, você faria uma chamada para a API de logout
    setIsLoggedIn(false);
    setUser(null);
    setMessage('Você saiu da sua conta.');
  };

  const InputField = ({ Icon, type, placeholder, value, onChange }) => (
    <div className="relative mb-4">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full p-3 pl-12 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 shadow-sm"
        required
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
      `}</style>
      
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl border border-gray-100">
        
        <div className="flex justify-center mb-6">
          <LogIn className="w-10 h-10 text-blue-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          {isLoggedIn ? 'Bem-vindo(a) de volta!' : 'Acessar Plataforma'}
        </h1>
        
        {/* Feedback de Mensagem */}
        {message && (
          <div className={`p-3 mb-4 rounded-lg flex items-center ${
            message.includes('sucesso') 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {message.includes('sucesso') ? null : <XCircle className="w-5 h-5 mr-2" />}
            {message}
          </div>
        )}

        {isLoggedIn ? (
          /* Tela de Usuário Logado */
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-6">
              Você está autenticado como: <br />
              <span className="font-semibold text-blue-600 break-words">{user.email}</span>
            </p>
            <button
              onClick={handleLogout}
              className="w-full py-3 px-4 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Sair
            </button>
          </div>
        ) : (
          /* Formulário de Login */
          <form onSubmit={handleLogin}>
            <InputField
              Icon={User}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            
            <InputField
              Icon={Lock}
              type="password"
              placeholder="Senha"
              // A CORREÇÃO PRINCIPAL: Vinculação do valor do input ao estado 'password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200 flex items-center justify-center shadow-lg hover:shadow-xl disabled:bg-blue-400"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Entrar
                </>
              )}
            </button>
          </form>
        )}
      </div>
      
      <p className="mt-6 text-sm text-gray-500">
        Desenvolvido com Supabase e Vercel Serverless.
      </p>
    </div>
  );
};

export default App;
