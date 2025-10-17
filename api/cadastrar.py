# api/cadastrar.py

import json
import os
import re # Para expressões regulares (email e CPF)
from supabase import create_client, PostgrestAPIError
import bcrypt
import datetime

# Função principal que o Vercel Serverless Functions espera
def handler(request, response):
    # 1. Configuração (Variáveis de Ambiente e Supabase)
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_ANON_KEY")
    supabase = create_client(supabase_url, supabase_key)
    
    email_regex = re.compile(r'[^s@]+@[^s@]+.[^s@]+$')

    # Garante que é uma requisição POST
    if request.method != 'POST':
        response.status = 405
        return {'error': 'Método não permitido. Use POST.'}

    try:
        data = json.loads(request.body)
        
        # 2. Validação de campos essenciais
        email = data.get('email')
        senha = data.get('senha')
        cpf = data.get('cpf')
        termos_aceitos = data.get('termos_aceitos')

        if not all([email, senha, cpf, termos_aceitos]):
            response.status = 400
            return {'error': 'Dados essenciais (e-mail, senha, termos e CPF) ausentes.'}

        # 3. Validação de formato (Email e CPF)
        if not email_regex.match(email):
            response.status = 400
            return {'error': 'Formato de e-mail inválido.'}

        # Limpeza e validação simples de CPF (remover pontos/hífens)
        cpf_limpo = re.sub(r'[^0-9]', '', cpf)
        if len(cpf_limpo) != 11:
            response.status = 400
            return {'error': 'CPF inválido. Certifique-se de que tem 11 dígitos.'}
            
        # 4. Hashing da Senha
        # Gera o salt e o hash. O salt é embutido no hash
        salt = bcrypt.gensalt()
        # Codifica a senha para bytes antes de fazer o hash
        senha_hash = bcrypt.hashpw(senha.encode('utf-8'), salt).decode('utf-8')
        
        # 5. Montagem dos dados de cadastro
        # Note que os nomes das chaves (e.g., 'data_nascimento', 'logradouro')
        # devem corresponder exatamente às colunas da sua tabela 'cadastro' no Supabase
        cadastro_data = {
            'nome': data.get('nome'),
            'email': email,
            'telefone': data.get('telefone'),
            # Trata 'data-nascimento' ou 'data_nascimento'
            'data_nascimento': data.get('data-nascimento') or data.get('data_nascimento'),
            'cpf': cpf_limpo,
            'senha_hash': senha_hash, # Salva a senha criptografada
            'cep': data.get('cep'),
            'logradouro': data.get('logradouro'),
            'numero': data.get('numero'),
            'complemento': data.get('complemento'),
            'bairro': data.get('bairro'),
            'cidade': data.get('cidade'),
            'estado': data.get('estado'),
            'termos_aceitos': termos_aceitos,
            'email_confirmado': True, 
        }

        # 6. Inserção no Supabase (tabela 'cadastro')
        supabase.from_('cadastro').insert([cadastro_data]).execute()
        
        # 7. Resposta de sucesso (se a inserção for bem-sucedida)
        response.status = 201
        return { 
            'message': 'Cadastro realizado com sucesso! Redirecionando...', 
            'email': email
        }

    # 8. Tratamento de Erros da API/Supabase
    except PostgrestAPIError as e:
        # A API do Supabase no Python levanta uma exceção PostgrestAPIError
        # O código '23505' é o código SQL para violação de UNIQUE CONSTRAINT (duplicidade)
        if e.code == '23505':
            response.status = 409 # Código de Conflito
            return {'error': 'E-mail ou CPF já cadastrado. Verifique seus dados.'}
        else:
            print(f"Erro no Supabase: {e}")
            response.status = 500
            return {'error': 'Erro interno ao salvar os dados.'}
            
    except json.JSONDecodeError:
        response.status = 400
        return {'error': 'Requisição inválida. O corpo deve ser JSON.'}

    except Exception as e:
        print(f"Erro geral do servidor: {e}")
        response.status = 500
        return {'error': 'Erro desconhecido do servidor. Verifique o console do Vercel.'}