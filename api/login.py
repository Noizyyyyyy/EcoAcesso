# api/login.py

import json
import os
from supabase import create_client # Biblioteca do Supabase
import bcrypt # Biblioteca de criptografia de senha

# IMPORTANTE: A função deve se chamar 'handler' para o Vercel
def handler(request, response):
    # 1. Configuração (Variáveis de Ambiente)
    # No Python, as variáveis são lidas de forma confiável pelo módulo 'os'
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_ANON_KEY")
    supabase = create_client(supabase_url, supabase_key)

    # 2. Garante que é uma requisição POST
    if request.method != 'POST':
        response.status = 405
        # O Vercel espera um dicionário Python como resposta
        return {'error': 'Método não permitido. Use POST.'}

    try:
        # Tenta ler o JSON do corpo da requisição
        data = json.loads(request.body)
        email = data.get('email')
        senha = data.get('senha')

        if not email or not senha:
            response.status = 400
            return {'error': 'E-mail e senha são obrigatórios.'}

        # 3. Buscar o usuário e o hash da senha
        # A consulta Python é diferente da Node.js
        # .single() garante que apenas um resultado (ou nenhum) seja retornado
        result = supabase.from_('cadastro').select('id, senha_hash').eq('email', email).limit(1).execute()
        
        # O objeto result.data será uma lista, mesmo que vazia
        user_data = result.data
        
        if not user_data:
            response.status = 401
            return {'error': 'Credenciais inválidas. Verifique seu e-mail ou senha.'}
        
        user = user_data[0]
        senha_hash = user.get('senha_hash')

        # 4. Comparar a senha fornecida com o hash salvo
        # O bcrypt.checkpw espera bytes, então precisamos codificar a senha
        if not bcrypt.checkpw(senha.encode('utf-8'), senha_hash.encode('utf-8')):
            response.status = 401
            return {'error': 'Credenciais inválidas. Verifique seu e-mail ou senha.'}

        # 5. SUCESSO!
        response.status = 200
        return { 
            'success': True, 
            'message': 'Login bem-sucedido! Redirecionando...',
            'user_id': user.get('id')
        }

    except Exception as e:
        # Erro de JSON (formato) ou erro interno
        print(f"Erro na API de Login (Python): {e}") # O print vai para o log do Vercel
        response.status = 500
        return {'error': 'Erro interno do servidor. Verifique o console do Vercel.'}