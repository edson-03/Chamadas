document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initChamadas();
  initPresencas();
  initRelatorios();
  initLogout();
});

function initTabs() {
  document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn[data-tab]').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

function initLogout() {
  document.getElementById('btnLogout').addEventListener('click', async () => {
    await fetch('/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  });
}

function initChamadas() {
  const btnNova = document.getElementById('btnNovaChamada');
  const form = document.getElementById('novaChamadaForm');
  const btnCriar = document.getElementById('btnCriarChamada');
  const btnCancelar = document.getElementById('btnCancelarChamada');
  const feedback = document.getElementById('chamadaCriada');

  btnNova.addEventListener('click', () => {
    form.hidden = false;
    btnNova.hidden = true;
    document.getElementById('responsavel').focus();
  });

  btnCancelar.addEventListener('click', () => {
    form.hidden = true;
    btnNova.hidden = false;
  });

  btnCriar.addEventListener('click', async () => {
    const responsavel = document.getElementById('responsavel').value.trim();
    if (!responsavel) return;

    btnCriar.disabled = true;
    btnCriar.textContent = 'Criando...';

    try {
      const res = await fetch('/chamada/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responsavel }),
      });
      const data = await res.json();

      if (data.success) {
        feedback.hidden = false;
        feedback.innerHTML = `<strong>Chamada criada!</strong><br>
          <span>Link: <a href="${data.chamada.link}" target="_blank">${data.chamada.link}</a></span>
          <button class="btn-sm btn-secondary" style="margin-left:0.5rem" onclick="navigator.clipboard.writeText('${data.chamada.link}');this.textContent='Copiado!'">Copiar Link</button>`;
        form.hidden = true;
        btnNova.hidden = false;
        document.getElementById('responsavel').value = '';
        loadChamadas();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Erro ao criar chamada');
    }

    btnCriar.disabled = false;
    btnCriar.textContent = 'Criar';
  });

  loadChamadas();
}

async function loadChamadas() {
  const tbody = document.querySelector('#tblChamadas tbody');
  tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Carregando...</td></tr>';

  try {
    const res = await fetch('/admin/api/chamadas');
    const data = await res.json();

    if (!data.chamadas || data.chamadas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhuma chamada encontrada</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    for (const c of data.chamadas.reverse()) {
      let presCount = '-';
      try {
        const pRes = await fetch(`/chamada/${c.id}/presencas`);
        const pData = await pRes.json();
        presCount = pData.total;
      } catch (e) { /* ignore */ }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td title="${c.id}">${c.id.substring(0, 8)}...</td>
        <td>${c.data}</td>
        <td>${c.hora}</td>
        <td>${c.responsavel}</td>
        <td><span class="status-${c.status || 'aberta'}">${c.status || 'aberta'}</span></td>
        <td>${presCount}</td>
        <td>
          <span class="link-copy" onclick="navigator.clipboard.writeText('${c.link}');this.textContent='Copiado!';setTimeout(()=>this.textContent='Copiar Link',2000)">Copiar Link</span>
          ${(c.status || 'aberta') === 'aberta'
            ? `<button class="btn-danger btn-sm" style="margin-left:0.5rem" onclick="encerrarChamada('${c.id}', this)">Encerrar</button>`
            : ''}
        </td>
      `;
      tbody.appendChild(tr);
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Erro ao carregar chamadas</td></tr>';
  }
}

async function encerrarChamada(id, btn) {
  if (!confirm('Deseja encerrar esta chamada?')) return;
  btn.disabled = true;
  try {
    const res = await fetch(`/chamada/${id}/encerrar`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      loadChamadas();
    } else {
      alert(data.error);
    }
  } catch (err) {
    alert('Erro ao encerrar chamada');
  }
  btn.disabled = false;
}

function initPresencas() {
  document.getElementById('btnFiltrar').addEventListener('click', loadPresencas);
  document.getElementById('btnLimpar').addEventListener('click', () => {
    document.getElementById('filtroMatricula').value = '';
    document.getElementById('filtroTurma').value = '';
    document.getElementById('filtroDataInicio').value = '';
    document.getElementById('filtroDataFim').value = '';
    loadPresencas();
  });
  loadPresencas();
}

async function loadPresencas() {
  const tbody = document.querySelector('#tblPresencas tbody');
  const countEl = document.getElementById('presencasCount');
  tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Carregando...</td></tr>';

  const params = new URLSearchParams();
  const matricula = document.getElementById('filtroMatricula').value.trim();
  const turma = document.getElementById('filtroTurma').value.trim();
  const dataInicio = document.getElementById('filtroDataInicio').value;
  const dataFim = document.getElementById('filtroDataFim').value;
  if (matricula) params.set('matricula', matricula);
  if (turma) params.set('turma', turma);
  if (dataInicio) params.set('dataInicio', dataInicio);
  if (dataFim) params.set('dataFim', dataFim);

  try {
    const res = await fetch(`/admin/api/presencas?${params}`);
    const data = await res.json();

    countEl.textContent = `${data.total || 0} registro(s) encontrado(s)`;

    if (!data.presencas || data.presencas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhuma presença encontrada</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.presencas.reverse().forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td title="${p.chamadaId}">${p.chamadaId.substring(0, 8)}...</td>
        <td>${p.matricula}</td>
        <td>${p.nome}</td>
        <td>${p.turma}</td>
        <td>${p.data}</td>
        <td>${p.hora}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Erro ao carregar presenças</td></tr>';
  }
}

function initRelatorios() {
  document.getElementById('btnRelAluno').addEventListener('click', async () => {
    const matricula = document.getElementById('relMatricula').value.trim();
    if (!matricula) return;

    const container = document.getElementById('relAlunoResult');
    container.hidden = false;
    container.innerHTML = '<p>Carregando...</p>';

    try {
      const res = await fetch(`/admin/api/relatorio/aluno/${encodeURIComponent(matricula)}`);
      const data = await res.json();
      if (!data.success) {
        container.innerHTML = `<p class="feedback error">${data.error}</p>`;
        return;
      }
      container.innerHTML = `
        <div class="report-card">
          <div class="stat"><span class="stat-label">Nome</span><span class="stat-value">${data.nome}</span></div>
          <div class="stat"><span class="stat-label">Turma</span><span class="stat-value">${data.turma}</span></div>
          <div class="stat"><span class="stat-label">Matrícula</span><span class="stat-value">${data.matricula}</span></div>
          <div class="stat"><span class="stat-label">Total de Chamadas</span><span class="stat-value">${data.totalChamadas}</span></div>
          <div class="stat"><span class="stat-label">Presenças</span><span class="stat-value">${data.totalPresencas}</span></div>
          <div class="stat"><span class="stat-label">Frequência</span><span class="stat-value">${data.frequencia}</span></div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = '<p class="feedback error">Erro ao gerar relatório</p>';
    }
  });

  document.getElementById('btnRelTurma').addEventListener('click', async () => {
    const turma = document.getElementById('relTurma').value.trim();
    if (!turma) return;

    const container = document.getElementById('relTurmaResult');
    container.hidden = false;
    container.innerHTML = '<p>Carregando...</p>';

    try {
      const res = await fetch(`/admin/api/relatorio/turma/${encodeURIComponent(turma)}`);
      const data = await res.json();
      if (!data.success) {
        container.innerHTML = `<p class="feedback error">${data.error}</p>`;
        return;
      }

      let html = `
        <div class="report-card">
          <div class="stat"><span class="stat-label">Turma</span><span class="stat-value">${data.turma}</span></div>
          <div class="stat"><span class="stat-label">Total de Alunos</span><span class="stat-value">${data.totalAlunos}</span></div>
          <div class="stat"><span class="stat-label">Total de Chamadas</span><span class="stat-value">${data.totalChamadas}</span></div>
        </div>
        <div class="table-scroll" style="margin-top:0.75rem">
        <table class="data-table">
          <thead><tr><th>Matrícula</th><th>Nome</th><th>Presenças</th><th>Frequência</th></tr></thead>
          <tbody>`;

      data.relatorio.forEach(r => {
        html += `<tr>
          <td>${r.matricula}</td>
          <td>${r.nome}</td>
          <td>${r.totalPresencas}/${r.totalChamadas}</td>
          <td>${r.frequencia}</td>
        </tr>`;
      });

      html += '</tbody></table></div>';
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = '<p class="feedback error">Erro ao gerar relatório</p>';
    }
  });

  document.getElementById('btnExportar').addEventListener('click', () => {
    const tipo = document.getElementById('exportTipo').value;
    const formato = document.getElementById('exportFormato').value;
    window.location.href = `/admin/api/export/${formato}?tipo=${tipo}`;
  });
}
