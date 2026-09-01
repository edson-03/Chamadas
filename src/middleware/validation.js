function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>"'&]/g, '').trim();
}

function validateMatricula(req, res, next) {
  const { matricula } = req.body;
  if (!matricula || typeof matricula !== 'string') {
    return res.status(400).json({ error: 'Matrícula é obrigatória' });
  }
  const cleaned = sanitize(matricula);
  if (cleaned.length < 1 || cleaned.length > 20) {
    return res.status(400).json({ error: 'Matrícula inválida' });
  }
  if (!/^[a-zA-Z0-9]+$/.test(cleaned)) {
    return res.status(400).json({ error: 'Matrícula deve conter apenas letras e números' });
  }
  req.body.matricula = cleaned;
  next();
}

function validateChamadaCreation(req, res, next) {
  const { responsavel } = req.body;
  if (!responsavel || typeof responsavel !== 'string') {
    return res.status(400).json({ error: 'Responsável é obrigatório' });
  }
  req.body.responsavel = sanitize(responsavel);
  next();
}

module.exports = { sanitize, validateMatricula, validateChamadaCreation };
