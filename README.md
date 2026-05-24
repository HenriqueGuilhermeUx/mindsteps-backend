# 🚀 MindSteps Backend - Deploy no Render

## Pré-requisitos
- Conta no [Render](https://render.com) (grátis)
- Conta no [Supabase](https://supabase.com) (grátis)
- Chave da API [OpenAI](https://platform.openai.com) (tem crédito gratuito)

## Passo a Passo

### 1️⃣ Configure o Supabase (Banco de Dados)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um novo projeto
3. Vá em **Settings > Database** e copie:
   - **Connection string** (será seu `DATABASE_URL`)
   - **Project URL** (será seu `SUPABASE_URL`)
4. Vá em **Settings > API** e copie:
   - **anon/public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY`

5. No SQL Editor do Supabase, execute o conteúdo de `supabase_schema.sql`

### 2️⃣ Configure o OpenAI

1. Acesse [platform.openai.com](https://platform.openai.com)
2. Vá em **API Keys** e crie uma nova chave
3. Guarde a chave (começa com `sk-`)

### 3️⃣ Deploy no Render

1. Acesse [render.com](https://render.com) e faça login com GitHub
2. Clique em **New +** → **Web Service**
3. Conecte seu repositório GitHub
4. Configure:
   - **Name:** `mindsteps-api`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** `Free`

5. Adicione as Environment Variables:
   ```
   DATABASE_URL=sua-connection-string-do-supabase
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_ANON_KEY=sua-chave-anonima
   SUPABASE_SERVICE_KEY=sua-chave-de-servico
   JWT_SECRET=uma-string-aleatoria-forte
   OPENAI_API_KEY=sua-chave-openai
   ```

6. Clique em **Create Web Service**
7. Aguarde o deploy (2-3 minutos)

### 4️⃣ Após o Deploy

Quando o deploy terminar, você verá uma URL como:
```
https://mindsteps-api.onrender.com
```

Guarde essa URL para configurar o frontend.

## 📁 Estrutura do Projeto

```
mindsteps-backend/
├── src/
│   ├── index.ts          # Entry point do servidor
│   ├── db/
│   │   └── index.ts      # Conexão com Supabase
│   ├── routers/
│   │   ├── auth.ts       # Autenticação (login/registro)
│   │   └── study.ts      # Estudo (chat, mensagens)
│   └── services/
│       └── ai.ts         # Integração OpenAI (Socratic)
├── package.json
├── tsconfig.json
├── Procfile
├── supabase_schema.sql   # Schema do banco
└── .env.example
```

## 🔧 Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/register` | Registrar novo usuário |
| POST | `/api/auth/login` | Login |
| GET | `/api/profile` | Ver perfil |
| POST | `/api/profile/update` | Atualizar perfil |
| POST | `/api/study/startSession` | Iniciar sessão |
| POST | `/api/study/sendMessage` | Enviar mensagem |
| GET | `/api/study/history/:id` | Histórico |
| POST | `/api/study/endSession` | Encerrar sessão |
| GET | `/api/usage/check` | Ver uso diário |

## ❌ Problemas Comuns

### "Connection refused" ou timeout
- Verifique se as variáveis de ambiente estão corretas
- O plano gratuito do Render "dorme" após 15min sem uso
- Na primeira requisição pode demorar 30s para acordar

### Erro de banco de dados
- Verifique se o schema foi executado no Supabase
- Confirme se a connection string está correta

### Erro 500 na API
- Verifique os logs no Render dashboard
- Geralmente é problema de variável de ambiente

## 📞 Suporte

Se tiver dúvidas, abra uma issue no GitHub!