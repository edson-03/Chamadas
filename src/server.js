const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { config, validateConfig } = require('./config/env');
const { initializeSheets } = require('./services/googleSheets');
const chamadaRouter = require('./routes/chamada');
const adminRouter = require('./routes/admin');
const logger = require('./utils/logger');

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

app.use(cors({ credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '../public')));

const presencaLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas. Aguarde um momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/chamada/:id/presenca', presencaLimiter);
app.use('/admin/login', loginLimiter);

let initialized = false;

async function initialize() {
  if (initialized) return;
  validateConfig();
  await initializeSheets();
  initialized = true;
}

app.use(async (req, res, next) => {
  try {
    await initialize();
    next();
  } catch (err) {
    logger.error('Falha ao inicializar', { error: err.message });
    res.status(500).json({ error: 'Erro ao inicializar o sistema' });
  }
});

app.get('/', (req, res) => {
  res.send(renderHomePage());
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/chamada', chamadaRouter);
app.use('/admin', adminRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.use((err, req, res, _next) => {
  logger.error('Erro não tratado', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Erro interno do servidor' });
});

if (require.main === module) {
  initialize().then(() => {
    app.listen(config.port, () => {
      logger.info(`Servidor rodando na porta ${config.port}`, { env: config.nodeEnv });
    });
  }).catch(err => {
    logger.error('Falha ao iniciar servidor', { error: err.message });
    process.exit(1);
  });
}

function renderHomePage() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sistema de Chamada</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <div class="container">
    <div class="card" style="text-align:center">
      <h1>Sistema de Chamada</h1>
      <p class="subtitle">Registro de Presença de Alunos</p>
      <p style="margin-top:1.5rem">
        <a href="/admin/login" style="color:var(--primary);text-decoration:none;font-weight:600">
          Acesso Administrativo →
        </a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

module.exports = app;
