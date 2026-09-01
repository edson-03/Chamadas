const SHEETS = {
  ALUNOS: {
    name: 'Alunos',
    headers: ['Matrícula', 'Nome', 'Turma', 'Situação'],
    range: 'Alunos!A:D',
  },
  CHAMADAS: {
    name: 'Chamadas',
    headers: ['ID Chamada', 'Data', 'Hora', 'Responsável', 'Link', 'Status'],
    range: 'Chamadas!A:F',
  },
  PRESENCAS: {
    name: 'Presenças',
    headers: ['ID Chamada', 'Matrícula', 'Nome', 'Turma', 'Data', 'Hora', 'Timestamp'],
    range: 'Presenças!A:G',
  },
  LOGS: {
    name: 'Logs',
    headers: ['Timestamp', 'Evento', 'Usuário', 'Detalhes', 'IP'],
    range: 'Logs!A:E',
  },
};

module.exports = SHEETS;
