const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { config } = require('../config/env');
const { requireAuth } = require('../middleware/auth');
const { validateMatricula, validateChamadaCreation } = require('../middleware/validation');
const sheets = require('../services/googleSheets');
const SHEETS_CONFIG = require('../config/sheets');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/criar', requireAuth, validateChamadaCreation, async (req, res) => {
  try {
    const { responsavel } = req.body;
    const chamadaId = uuidv4().replace(/-/g, '').substring(0, 12);
    const now = new Date();
    const data = now.toLocaleDateString('pt-BR');
    const hora = now.toLocaleTimeString('pt-BR');
    const link = `${config.appUrl}/chamada/${chamadaId}`;

    await sheets.appendRow(SHEETS_CONFIG.CHAMADAS.name, [
      chamadaId, data, hora, responsavel, link, 'aberta',
    ]);

    await sheets.addLog('CHAMADA_CRIADA', req.user.username, `Chamada ${chamadaId} criada por ${responsavel}`, req.ip);
    logger.info('Chamada criada', { chamadaId, responsavel });

    res.status(201).json({
      success: true,
      chamada: { id: chamadaId, data, hora, responsavel, link, status: 'aberta' },
    });
  } catch (err) {
    logger.error('Falha ao criar chamada', { error: err.message });
    await sheets.addLog('ERRO', 'sistema', `Falha ao criar chamada: ${err.message}`, req.ip).catch(() => {});
    res.status(500).json({ error: 'Erro ao criar chamada. Tente novamente.' });
  }
});

router.post('/:chamadaId/encerrar', requireAuth, async (req, res) => {
  try {
    const { chamadaId } = req.params;
    const chamada = await sheets.findChamada(chamadaId);
    if (!chamada) {
      return res.status(404).json({ error: 'Chamada não encontrada' });
    }
    if (chamada.status === 'encerrada') {
      return res.status(400).json({ error: 'Chamada já está encerrada' });
    }

    const rowIndex = await sheets.getChamadaRowIndex(chamadaId);
    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Chamada não encontrada na planilha' });
    }

    await sheets.updateCell(`${SHEETS_CONFIG.CHAMADAS.name}!F${rowIndex}`, 'encerrada');
    await sheets.addLog('CHAMADA_ENCERRADA', req.user.username, `Chamada ${chamadaId} encerrada`, req.ip);
    logger.info('Chamada encerrada', { chamadaId });

    res.json({ success: true, message: 'Chamada encerrada com sucesso' });
  } catch (err) {
    logger.error('Falha ao encerrar chamada', { error: err.message });
    res.status(500).json({ error: 'Erro ao encerrar chamada. Tente novamente.' });
  }
});

router.get('/:chamadaId', async (req, res) => {
  try {
    const { chamadaId } = req.params;
    const chamada = await sheets.findChamada(chamadaId);

    if (!chamada) {
      return res.status(404).send(renderErrorPage('Chamada não encontrada', 'O link informado não corresponde a nenhuma chamada válida.'));
    }
    if (chamada.status === 'encerrada') {
      return res.status(410).send(renderErrorPage('Chamada encerrada', 'Esta chamada já foi encerrada e não aceita mais registros de presença.'));
    }

    res.send(renderPresencaPage(chamada));
  } catch (err) {
    logger.error('Falha ao carregar página da chamada', { error: err.message });
    res.status(500).send(renderErrorPage('Erro', 'Ocorreu um erro ao carregar a chamada. Tente novamente.'));
  }
});

router.post('/:chamadaId/presenca', validateMatricula, async (req, res) => {
  const { chamadaId } = req.params;
  const { matricula } = req.body;

  try {
    const chamada = await sheets.findChamada(chamadaId);
    if (!chamada) {
      await sheets.addLog('TENTATIVA_INVALIDA', matricula, `Chamada inexistente: ${chamadaId}`, req.ip);
      return res.status(404).json({ error: 'Chamada não encontrada' });
    }
    if (chamada.status === 'encerrada') {
      await sheets.addLog('TENTATIVA_INVALIDA', matricula, `Chamada encerrada: ${chamadaId}`, req.ip);
      return res.status(410).json({ error: 'Esta chamada já foi encerrada' });
    }

    const aluno = await sheets.findAluno(matricula);
    if (!aluno) {
      await sheets.addLog('TENTATIVA_INVALIDA', matricula, `Matrícula inexistente: ${matricula}`, req.ip);
      return res.status(404).json({ error: 'Matrícula não encontrada na base de alunos' });
    }
    if (aluno.situacao.toLowerCase() !== 'ativo') {
      await sheets.addLog('TENTATIVA_INVALIDA', matricula, `Aluno inativo: ${matricula}`, req.ip);
      return res.status(403).json({ error: 'Aluno com situação inativa. Procure a secretaria.' });
    }

    const isDuplicate = await sheets.checkDuplicatePresenca(chamadaId, matricula);
    if (isDuplicate) {
      await sheets.addLog('TENTATIVA_DUPLICADA', matricula, `Presença duplicada: ${matricula} em ${chamadaId}`, req.ip);
      return res.status(409).json({ error: 'Presença já registrada nesta chamada' });
    }

    const now = new Date();
    const data = now.toLocaleDateString('pt-BR');
    const hora = now.toLocaleTimeString('pt-BR');
    const timestamp = now.toISOString();

    await sheets.appendRow(SHEETS_CONFIG.PRESENCAS.name, [
      chamadaId, matricula, aluno.nome, aluno.turma, data, hora, timestamp,
    ]);

    await sheets.addLog('PRESENCA_REGISTRADA', matricula, `Presença registrada: ${aluno.nome} (${matricula}) em ${chamadaId}`, req.ip);
    logger.info('Presença registrada', { chamadaId, matricula, nome: aluno.nome });

    res.json({
      success: true,
      message: 'Presença registrada com sucesso!',
      aluno: { nome: aluno.nome, turma: aluno.turma, matricula },
      horario: `${data} ${hora}`,
    });
  } catch (err) {
    logger.error('Falha ao registrar presença', { error: err.message, chamadaId, matricula });
    await sheets.addLog('ERRO', matricula || 'desconhecido', `Erro ao registrar presença: ${err.message}`, req.ip).catch(() => {});
    res.status(500).json({ error: 'Erro ao registrar presença. Tente novamente.' });
  }
});

router.get('/:chamadaId/presencas', requireAuth, async (req, res) => {
  try {
    const presencas = await sheets.getPresencasByChamada(req.params.chamadaId);
    res.json({ success: true, presencas, total: presencas.length });
  } catch (err) {
    logger.error('Falha ao buscar presenças', { error: err.message });
    res.status(500).json({ error: 'Erro ao buscar presenças' });
  }
});

function renderErrorPage(title, message) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Sistema de Chamada</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <div class="container">
    <div class="card error-card">
      <div class="icon-error">✕</div>
      <h1>${title}</h1>
      <p>${message}</p>
    </div>
  </div>
</body>
</html>`;
}

function renderPresencaPage(chamada) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registro de Presença - Sistema de Chamada</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Registro de Presença</h1>
      <p class="chamada-info">Chamada: <strong>${chamada.id}</strong> — ${chamada.data} ${chamada.hora}</p>

      <form id="presencaForm">
        <div class="form-group">
          <label for="matricula">Matrícula</label>
          <input type="text" id="matricula" name="matricula" placeholder="Digite sua matrícula"
            required maxlength="20" pattern="[a-zA-Z0-9]+" autocomplete="off">
        </div>
        <button type="submit" id="btnSubmit">Confirmar Presença</button>
      </form>

      <div id="feedback" class="feedback" hidden></div>
    </div>
  </div>
  <script>
    const form = document.getElementById('presencaForm');
    const feedback = document.getElementById('feedback');
    const btnSubmit = document.getElementById('btnSubmit');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const matricula = document.getElementById('matricula').value.trim();
      if (!matricula) return;

      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Registrando...';
      feedback.hidden = true;

      try {
        const res = await fetch('/chamada/${chamada.id}/presenca', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matricula }),
        });
        const data = await res.json();

        feedback.hidden = false;
        if (data.success) {
          feedback.className = 'feedback success';
          feedback.innerHTML = '<div class="icon-success">✓</div>' +
            '<strong>' + data.message + '</strong><br>' +
            '<span>Aluno: ' + data.aluno.nome + '</span><br>' +
            '<span>Turma: ' + data.aluno.turma + '</span><br>' +
            '<span>Horário: ' + data.horario + '</span>';
          form.reset();
        } else {
          feedback.className = 'feedback error';
          feedback.innerHTML = '<div class="icon-error">✕</div><strong>' + data.error + '</strong>';
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Confirmar Presença';
        }
      } catch (err) {
        feedback.hidden = false;
        feedback.className = 'feedback error';
        feedback.innerHTML = '<div class="icon-error">✕</div><strong>Erro de conexão. Tente novamente.</strong>';
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Confirmar Presença';
      }
    });
  </script>
</body>
</html>`;
}

module.exports = router;
