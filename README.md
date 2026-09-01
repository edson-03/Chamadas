# Sistema de Chamada — Registro de Presença de Alunos

Sistema web de controle de presença de alunos integrado ao Google Sheets.

## Funcionalidades

- **Abertura de chamadas** com link exclusivo para cada uma
- **Registro de presença** com validação de matrícula contra base oficial
- **Painel administrativo** protegido por autenticação
- **Relatórios** de frequência por aluno e turma
- **Exportação** em CSV e XLSX
- **Auditoria** completa de todas as ações
- **Proteção contra fraudes**: duplicidade, matrícula inativa, limitação de requisições

## Tecnologias

- Node.js + Express.js
- Google Sheets API (googleapis)
- JWT para autenticação
- bcrypt para hash de senhas
- Helmet + CORS + Rate Limiting

## Pré-requisitos

- Node.js >= 18
- Conta Google com acesso à API Google Sheets
- Conta de Serviço (Service Account) no Google Cloud Platform

## Instalação

### 1. Clonar e instalar dependências

```bash
git clone <url-do-repositorio>
cd chamadas
npm install
```

### 2. Configurar API do Google Sheets

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto ou selecione um existente
3. Ative a **Google Sheets API**
4. Crie uma **Conta de Serviço** (Contas de Serviço / Service Accounts)
5. Gere uma chave JSON para a Conta de Serviço
6. Crie uma planilha no Google Sheets
7. Compartilhe a planilha com o email da Conta de Serviço (permissão de Editor)

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha o `.env`:

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=<gerar-com-openssl-rand-base64-32>
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<gerar-com-script>
GOOGLE_SHEETS_ID=<id-da-planilha>
GOOGLE_SERVICE_ACCOUNT_EMAIL=<email-conta-de-servico>
GOOGLE_PRIVATE_KEY="<chave-privada-do-json>"
APP_URL=https://seu-dominio.com
```

### 4. Gerar hash da senha do administrador

```bash
node scripts/generate-password.js suaSenhaSegura
```

Copie o hash gerado para `ADMIN_PASSWORD_HASH` no `.env`.

### 5. Inicializar planilhas

```bash
node scripts/setup-sheets.js
```

Cria automaticamente as abas: Alunos, Chamadas, Presenças, Logs.

### 6. Popular aba de Alunos

Na planilha Google Sheets, preencha a aba **Alunos** com os dados:

| Matrícula | Nome | Turma | Situação |
|-----------|------|-------|----------|
| 20240001 | João Silva | 1A | Ativo |
| 20240002 | Maria Santos | 1A | Ativo |

### 7. Iniciar o servidor

```bash
npm start
```

## Uso

### Fluxo do Professor

1. Acesse `/admin/login` e faça login
2. No painel, clique em **Nova Chamada**
3. Informe o responsável e crie a chamada
4. Copie o link gerado e compartilhe com os alunos

### Fluxo do Aluno

1. Acesse o link da chamada recebido
2. Digite sua matrícula
3. Clique em **Confirmar Presença**
4. Visualize a confirmação com nome, turma e horário

### Relatórios

- Frequência por aluno (matrícula)
- Frequência por turma
- Exportação em CSV/XLSX

## Estrutura das Planilhas

### Aba: Alunos
`Matrícula | Nome | Turma | Situação`

### Aba: Chamadas
`ID Chamada | Data | Hora | Responsável | Link | Status`

### Aba: Presenças
`ID Chamada | Matrícula | Nome | Turma | Data | Hora | Timestamp`

### Aba: Logs
`Timestamp | Evento | Usuário | Detalhes | IP`

## API REST

| Método | Rota | Descrição | Autenticação |
|--------|------|-----------|--------------|
| POST | `/chamada/criar` | Criar chamada | Sim |
| GET | `/chamada/:id` | Página de presença | Não |
| POST | `/chamada/:id/presenca` | Registrar presença | Não |
| POST | `/chamada/:id/encerrar` | Encerrar chamada | Sim |
| GET | `/chamada/:id/presencas` | Listar presenças da chamada | Sim |
| POST | `/admin/login` | Login | Não |
| POST | `/admin/logout` | Logout | Não |
| GET | `/admin/api/chamadas` | Listar chamadas | Sim |
| GET | `/admin/api/alunos` | Listar alunos | Sim |
| GET | `/admin/api/presencas` | Listar presenças (com filtros) | Sim |
| GET | `/admin/api/relatorio/aluno/:matricula` | Relatório do aluno | Sim |
| GET | `/admin/api/relatorio/turma/:turma` | Relatório da turma | Sim |
| GET | `/admin/api/export/:formato` | Exportar (csv/xlsx) | Sim |

## Segurança

- Validação no servidor de todas as entradas
- Limitação de requisições no registro de presença e login
- JWT com expiração de 8h em cookie httpOnly
- Helmet para cabeçalhos de segurança
- Sanitização de inputs
- Auditoria completa na aba Logs

## Deploy

### Vercel

```bash
npm i -g vercel
vercel --prod
```

### Render / Railway

Configure as variáveis de ambiente no painel do serviço e faça deploy via Git.

## Backup

Os dados ficam no Google Sheets, que possui:
- Histórico de versões automático
- Acesso via API a qualquer momento
- Exportação manual pela interface do Google

## Testes

```bash
npm test
```

## Estrutura do Projeto

```
src/
├── server.js              # Servidor Express + middlewares de segurança
├── config/
│   ├── env.js             # Configuração de ambiente + validação
│   └── sheets.js          # Definição das abas do Google Sheets
├── middleware/
│   ├── auth.js            # Autenticação JWT
│   └── validation.js      # Sanitização + validação de entrada
├── routes/
│   ├── chamada.js         # Endpoints de presença + páginas do aluno
│   └── admin.js           # Painel admin, relatórios, exportação
├── services/
│   └── googleSheets.js    # Integração completa com Google Sheets API
└── utils/
    └── logger.js          # Log estruturado em JSON
public/                    # Arquivos do frontend (CSS + JS)
tests/                     # Testes automatizados
scripts/                   # Gerador de hash de senha + configuração das abas
```
