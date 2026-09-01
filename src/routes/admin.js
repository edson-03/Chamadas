const express = require('express');
const bcrypt = require('bcrypt');
const { config } = require('../config/env');
const { generateToken, requireAuth } = require('../middleware/auth');
const sheets = require('../services/googleSheets');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/login', (req, res) => {
  res.send(renderLoginPage());
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }

    if (username !== config.adminUsername) {
      await sheets.addLog('LOGIN_FALHA', username, 'Usuário inválido', req.ip);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const valid = await bcrypt.compare(password, config.adminPasswordHash);
    if (!valid) {
      await sheets.addLog('LOGIN_FALHA', username, 'Senha inválida', req.ip);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = generateToken(username);
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
    });

    await sheets.addLog('LOGIN_SUCESSO', username, 'Login realizado', req.ip);
    res.json({ success: true, token });
  } catch (err) {
    logger.error('Erro no login', { error: err.message });
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

router.get('/painel', requireAuth, (req, res) => {
  res.send(renderAdminPanel());
});

router.get('/api/chamadas', requireAuth, async (req, res) => {
  try {
    const chamadas = await sheets.getAllChamadas();
    res.json({ success: true, chamadas });
  } catch (err) {
    logger.error('Falha ao listar chamadas', { error: err.message });
    res.status(500).json({ error: 'Erro ao buscar chamadas' });
  }
});

router.get('/api/alunos', requireAuth, async (req, res) => {
  try {
    const alunos = await sheets.getAllAlunos();
    res.json({ success: true, alunos });
  } catch (err) {
    logger.error('Falha ao listar alunos', { error: err.message });
    res.status(500).json({ error: 'Erro ao buscar alunos' });
  }
});

router.get('/api/presencas', requireAuth, async (req, res) => {
  try {
    const presencas = await sheets.getAllPresencas();
    const { matricula, turma, dataInicio, dataFim, chamadaId } = req.query;

    let filtered = presencas;
    if (matricula) filtered = filtered.filter(p => p.matricula === matricula);
    if (turma) filtered = filtered.filter(p => p.turma === turma);
    if (chamadaId) filtered = filtered.filter(p => p.chamadaId === chamadaId);
    if (dataInicio || dataFim) {
      filtered = filtered.filter(p => {
        const parts = p.data.split('/');
        if (parts.length !== 3) return true;
        const pDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (dataInicio && pDate < new Date(dataInicio)) return false;
        if (dataFim && pDate > new Date(dataFim)) return false;
        return true;
      });
    }

    res.json({ success: true, presencas: filtered, total: filtered.length });
  } catch (err) {
    logger.error('Falha ao listar presenças', { error: err.message });
    res.status(500).json({ error: 'Erro ao buscar presenças' });
  }
});

router.get('/api/relatorio/aluno/:matricula', requireAuth, async (req, res) => {
  try {
    const presencas = await sheets.getAllPresencas();
    const chamadas = await sheets.getAllChamadas();
    const filtered = presencas.filter(p => p.matricula === req.params.matricula);

    const totalChamadas = chamadas.length;
    const totalPresencas = filtered.length;
    const frequencia = totalChamadas > 0 ? ((totalPresencas / totalChamadas) * 100).toFixed(1) : '0.0';

    res.json({
      success: true,
      matricula: req.params.matricula,
      nome: filtered[0]?.nome || 'N/A',
      turma: filtered[0]?.turma || 'N/A',
      totalChamadas,
      totalPresencas,
      frequencia: `${frequencia}%`,
      presencas: filtered,
    });
  } catch (err) {
    logger.error('Falha ao gerar relatório do aluno', { error: err.message });
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

router.get('/api/relatorio/turma/:turma', requireAuth, async (req, res) => {
  try {
    const alunos = await sheets.getAllAlunos();
    const presencas = await sheets.getAllPresencas();
    const chamadas = await sheets.getAllChamadas();

    const turmaAlunos = alunos.filter(a => a.turma === req.params.turma);
    const totalChamadas = chamadas.length;

    const relatorio = turmaAlunos.map(aluno => {
      const alunoPresencas = presencas.filter(p => p.matricula === aluno.matricula);
      const freq = totalChamadas > 0 ? ((alunoPresencas.length / totalChamadas) * 100).toFixed(1) : '0.0';
      return {
        matricula: aluno.matricula,
        nome: aluno.nome,
        totalPresencas: alunoPresencas.length,
        totalChamadas,
        frequencia: `${freq}%`,
      };
    });

    res.json({ success: true, turma: req.params.turma, totalAlunos: turmaAlunos.length, totalChamadas, relatorio });
  } catch (err) {
    logger.error('Falha ao gerar relatório da turma', { error: err.message });
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

router.get('/api/export/:format', requireAuth, async (req, res) => {
  try {
    const { format } = req.params;
    const { tipo, filtro } = req.query;
    let data;

    if (tipo === 'presencas') {
      data = await sheets.getAllPresencas();
      if (filtro) {
        data = data.filter(p => p.turma === filtro || p.matricula === filtro || p.chamadaId === filtro);
      }
    } else if (tipo === 'chamadas') {
      data = await sheets.getAllChamadas();
    } else {
      data = await sheets.getAllPresencas();
    }

    if (format === 'csv') {
      const headers = Object.keys(data[0] || {});
      const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${(row[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=relatorio_${tipo || 'dados'}.csv`);
      return res.send('﻿' + csv);
    }

    if (format === 'xlsx') {
      const XLSX = require('xlsx');
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=relatorio_${tipo || 'dados'}.xlsx`);
      return res.send(buffer);
    }

    res.status(400).json({ error: 'Formato não suportado. Use csv ou xlsx.' });
  } catch (err) {
    logger.error('Falha ao exportar dados', { error: err.message });
    res.status(500).json({ error: 'Erro ao exportar dados' });
  }
});

function renderLoginPage() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - Painel Administrativo</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <div class="container">
    <div class="card login-card">
      <h1>Painel Administrativo</h1>
      <p class="subtitle">Sistema de Chamada</p>
      <form id="loginForm">
        <div class="form-group">
          <label for="username">Usuário</label>
          <input type="text" id="username" name="username" required autocomplete="username">
        </div>
        <div class="form-group">
          <label for="password">Senha</label>
          <input type="password" id="password" name="password" required autocomplete="current-password">
        </div>
        <button type="submit" id="btnLogin">Entrar</button>
        <div id="loginError" class="feedback error" hidden></div>
      </form>
    </div>
  </div>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnLogin');
      const err = document.getElementById('loginError');
      btn.disabled = true;
      btn.textContent = 'Entrando...';
      err.hidden = true;

      try {
        const res = await fetch('/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
          }),
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = '/admin/painel';
        } else {
          err.hidden = false;
          err.textContent = data.error;
          btn.disabled = false;
          btn.textContent = 'Entrar';
        }
      } catch (error) {
        err.hidden = false;
        err.textContent = 'Erro de conexão';
        btn.disabled = false;
        btn.textContent = 'Entrar';
      }
    });
  </script>
</body>
</html>`;
}

function renderAdminPanel() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Painel Administrativo - Sistema de Chamada</title>
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/admin.css">
</head>
<body>
  <header class="admin-header">
    <h1>Sistema de Chamada</h1>
    <nav>
      <button class="nav-btn active" data-tab="chamadas">Chamadas</button>
      <button class="nav-btn" data-tab="presencas">Presenças</button>
      <button class="nav-btn" data-tab="relatorios">Relatórios</button>
      <button class="nav-btn logout" id="btnLogout">Sair</button>
    </nav>
  </header>

  <main class="admin-main">
    <!-- Tab: Chamadas -->
    <section id="tab-chamadas" class="tab-content active">
      <div class="section-header">
        <h2>Gerenciar Chamadas</h2>
        <button id="btnNovaChamada" class="btn-primary">Nova Chamada</button>
      </div>

      <div id="novaChamadaForm" class="inline-form" hidden>
        <input type="text" id="responsavel" placeholder="Nome do responsável" required>
        <button id="btnCriarChamada" class="btn-primary">Criar</button>
        <button id="btnCancelarChamada" class="btn-secondary">Cancelar</button>
      </div>

      <div id="chamadaCriada" class="feedback success" hidden></div>

      <table id="tblChamadas" class="data-table">
        <thead>
          <tr>
            <th>ID</th><th>Data</th><th>Hora</th><th>Responsável</th><th>Status</th><th>Presenças</th><th>Ações</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>

    <!-- Tab: Presenças -->
    <section id="tab-presencas" class="tab-content">
      <h2>Consultar Presenças</h2>
      <div class="filters">
        <input type="text" id="filtroMatricula" placeholder="Matrícula">
        <input type="text" id="filtroTurma" placeholder="Turma">
        <input type="date" id="filtroDataInicio" title="Data início">
        <input type="date" id="filtroDataFim" title="Data fim">
        <button id="btnFiltrar" class="btn-primary">Filtrar</button>
        <button id="btnLimpar" class="btn-secondary">Limpar</button>
      </div>

      <div id="presencasCount" class="count-badge"></div>

      <table id="tblPresencas" class="data-table">
        <thead>
          <tr>
            <th>ID Chamada</th><th>Matrícula</th><th>Nome</th><th>Turma</th><th>Data</th><th>Hora</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>

    <!-- Tab: Relatórios -->
    <section id="tab-relatorios" class="tab-content">
      <h2>Relatórios</h2>

      <div class="report-section">
        <h3>Frequência por Aluno</h3>
        <div class="inline-form">
          <input type="text" id="relMatricula" placeholder="Matrícula do aluno">
          <button id="btnRelAluno" class="btn-primary">Gerar</button>
        </div>
        <div id="relAlunoResult" hidden></div>
      </div>

      <div class="report-section">
        <h3>Frequência por Turma</h3>
        <div class="inline-form">
          <input type="text" id="relTurma" placeholder="Turma (ex: 1A)">
          <button id="btnRelTurma" class="btn-primary">Gerar</button>
        </div>
        <div id="relTurmaResult" hidden></div>
      </div>

      <div class="report-section">
        <h3>Exportar Dados</h3>
        <div class="inline-form">
          <select id="exportTipo">
            <option value="presencas">Presenças</option>
            <option value="chamadas">Chamadas</option>
          </select>
          <select id="exportFormato">
            <option value="csv">CSV</option>
            <option value="xlsx">XLSX</option>
          </select>
          <button id="btnExportar" class="btn-primary">Exportar</button>
        </div>
      </div>
    </section>
  </main>

  <script src="/js/admin.js"></script>
</body>
</html>`;
}

module.exports = router;
