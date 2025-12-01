import React, { useState, useEffect } from 'react';
// Caminhos de importação corrigidos para o formato relativo, que é mais robusto quando o ficheiro de origem e a pasta 'api' são irmãos.
import { cadastrar } from './api/cadastrar.js';
import { login, getFirebaseAuthInstance } from './api/login.js';
import { onAuthChange, fazerLogout } from './api/confirmar.js';
import { Home, User, LogIn, LogOut, Mail, Lock } from 'lucide-react';

const LoginView = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // Listener de Estado de Autenticação
    useEffect(() => {
        const auth = getFirebaseAuthInstance();
        if (!auth) {
            setError("Erro: Firebase Auth não está disponível.");
            // Não retorna aqui para que o componente possa renderizar o erro
        }

        if (!auth) return; // Retorna se a autenticação não estiver disponível

        // Usa a função onAuthChange do seu módulo confirmar.js
        const unsubscribe = onAuthChange((currentUser) => {
            setUser(currentUser);
            setIsAuthReady(true);
            if (currentUser) {
                // Loga apenas o UID se for anônimo, ou o email se for um usuário real
                console.log("Estado de Auth mudou. UID:", currentUser.uid, "Email:", currentUser.email || "Anônimo");
            }
        });

        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await cadastrar(email, password);
            }
            // Sucesso: o listener onAuthChange irá atualizar o estado 'user'
            setEmail('');
            setPassword('');
        } catch (err) {
            console.error("Erro de Autenticação:", err.code, err.message);
            // Mapeamento de erros
            let errorMessage = "Ocorreu um erro desconhecido.";
            if (err.code.includes('user-not-found') || err.code.includes('wrong-password') || err.code.includes('invalid-credential')) {
                errorMessage = "Email ou senha incorretos.";
            } else if (err.code.includes('email-already-in-use')) {
                errorMessage = "Este email já está cadastrado.";
            } else if (err.code.includes('weak-password')) {
                errorMessage = "A senha deve ter pelo menos 6 caracteres.";
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        setLoading(true);
        try {
            await fazerLogout();
            setError('');
        } catch (err) {
            setError("Erro ao sair. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    // --- Componentes Reutilizáveis de UI ---

    const InputField = ({ Icon, type = 'text', value, onChange, placeholder }) => (
        <div className="relative mb-4">
            <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out shadow-inner"
            />
        </div>
    );

    const AuthCard = (
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm">
            <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-6">
                {isLogin ? 'Bem-vindo de Volta' : 'Criar Conta'}
            </h2>
            
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm" role="alert">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <InputField
                    Icon={Mail}
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <InputField
                    Icon={Lock}
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                
                <button
                    type="submit"
                    disabled={loading || !isAuthReady}
                    className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-700 transition duration-200 ease-in-out shadow-lg transform hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center"
                >
                    {loading ? (
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <>{isLogin ? <LogIn className="w-5 h-5 mr-2" /> : <User className="w-5 h-5 mr-2" />}
                        {isLogin ? 'Entrar' : 'Cadastrar'}</>
                    )}
                </button>
            </form>

            <div className="mt-6 text-center text-sm">
                <p className="text-gray-600">
                    {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-indigo-600 font-semibold hover:text-indigo-800 ml-1 transition duration-150"
                        disabled={loading || !isAuthReady}
                    >
                        {isLogin ? 'Cadastre-se' : 'Entrar'}
                    </button>
                </p>
            </div>
            {!isAuthReady && (
                 <p className="mt-4 text-xs text-yellow-600">
                    Aguardando a inicialização do Firebase Auth...
                </p>
            )}
        </div>
    );

    const ProfileCard = (
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-lg text-center">
            <User className="w-16 h-16 text-indigo-500 mx-auto mb-4 p-2 bg-indigo-50 rounded-full"/>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
                Acesso Concedido!
            </h2>
            <p className="text-lg text-gray-600 mb-6">
                Você está logado como: <span className="font-mono text-indigo-600 break-all text-sm block mt-1">{user?.email || `Anônimo (UID: ${user?.uid})`}</span>
            </p>
            
            <p className="text-sm text-gray-500 mb-6">
                ID do Aplicativo: <span className="font-mono">{typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}</span>
            </p>

            <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-red-700 transition duration-200 ease-in-out shadow-lg transform hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center mx-auto max-w-xs"
            >
                <LogOut className="w-5 h-5 mr-2" /> Sair
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-[Inter]">
            {/* O script Tailwind e o estilo body/font-family são importantes para a estética e devem ser carregados no HTML principal, mas incluídos aqui para fins de demonstração em arquivo único. */}
            <script src="https://cdn.tailwindcss.com"></script>
            <style jsx>{`
                body { font-family: 'Inter', sans-serif; }
            `}</style>
            
            {user ? ProfileCard : AuthCard}
        </div>
    );
};

export default LoginView;
