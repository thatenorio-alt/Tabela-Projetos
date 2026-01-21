/* =====================================================
   VARIÁVEL GLOBAL
===================================================== */
let dadosGlobais = [];

/* =====================================================
   CARREGAMENTO DO CSV
===================================================== */
fetch('dados.csv')
  .then(r => r.text())
  .then(texto => {
    dadosGlobais = csvParaJson(texto);
    popularFiltros(dadosGlobais);
    aplicarFiltros();
  })
  .catch(err => console.error('Erro ao carregar CSV:', err));

/* =====================================================
   NORMALIZAÇÃO DE CABEÇALHOS
===================================================== */
function normalizar(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

function csvParaJson(csv) {
  const linhas = csv.split(/\r?\n/).filter(l => l.trim() !== '');
  const cabOriginal = linhas[0].split(';');
  const cab = cabOriginal.map(c => normalizar(c));

  return linhas.slice(1).map(l => {
    const v = l.split(';');
    const o = {};
    cab.forEach((c, i) => {
      o[c] = v[i] ? v[i].trim() : '';
    });
    return o;
  });
}

/* =====================================================
   DATA → MÊS/ANO (DD/MM/AAAA → YYYY-MM)
===================================================== */
function extrairMesAno(data) {
  if (!data) return '';

  if (data.includes('/')) {
    const [dia, mes, ano] = data.split('/');
    if (ano && mes) return `${ano}-${mes.padStart(2, '0')}`;
  }

  if (data.includes('-')) {
    const partes = data.split('-');
    if (partes.length >= 2) return `${partes[0]}-${partes[1]}`;
  }

  return '';
}

/* =====================================================
   FORMATAR MÊS/ANO (Julho/2026)
===================================================== */
function formatarMesAno(mesAno) {
  if (!mesAno) return '';

  const [ano, mes] = mesAno.split('-');
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril',
    'Maio', 'Junho', 'Julho', 'Agosto',
    'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return `${meses[Number(mes) - 1]}/${ano}`;
}

/* =====================================================
   KPIs
===================================================== */
function atualizarKPIs(dados) {

  // Frentes únicas (Contrato + Frente)
  const frentes = new Set();
  dados.forEach(d => {
    frentes.add(`${d.contrato}||${d.frentedeservico}`);
  });

  const totalFrentes = frentes.size;

  // Obras lineares
  const lineares = dados.filter(d => d.tipodeobra === 'Linear');

  const edital = soma(lineares, 'extensaoeditalm');
  const exec   = soma(lineares, 'extensaoexecutivom');
  const diferenca = exec - edital;

  // Obras localizadas (quantidade)
  const localizadas = dados.filter(d => d.tipodeobra === 'Localizada').length;


  // Escrita
  document.getElementById('kpiFrentes').innerText = totalFrentes;
  document.getElementById('kpiEdital').innerText  = edital.toFixed(2);
  document.getElementById('kpiExec').innerText    = exec.toFixed(2);
  document.getElementById('kpiDif').innerText     = diferenca.toFixed(2);
  document.getElementById('kpiLoc').innerText     = localizadas;
}

/* =====================================================
   TABELA CONSOLIDADA POR FRENTE
===================================================== */
function montarTabela(dados) {

  const frentesMap = new Map();

  dados.forEach(d => {
    const chave = `${d.contrato}||${d.frentedeservico}`;

    if (!frentesMap.has(chave)) {
      frentesMap.set(chave, {
        contrato: d.contrato,
        coordenacao: d.coordenacao || '',
        frente: d.frentedeservico,
        tipo: d.tipodeobra,
        inicio: d.previsaodeinicio || '',
        linear: d.statusprojetoexecutivolinear || '',
        hidromec: d.statusprojetoexecutivohidromecanico || '',
        eletrica: d.statusprojetoexecutivoeletrica || '',
        civil: d.statusprojetoexecutivocivil || '',
        entrada: d.statusentradadeenergia || '',
        economias: d.economiascontempladas || '',
        escopo: d.escopo || ''
      });
    }
  });

  let html = `<table>
    <thead>
      <tr>
        <th>Contrato</th>
        <th>Coordenação</th>
        <th>Frente</th>
        <th>Tipo</th>
        <th>Previsão de Início</th>
        <th>Status Linear</th>
        <th>Status Hidromecânico</th>
        <th>Status Elétrica</th>
        <th>Status Civil</th>
        <th>Entrada de Energia</th>
        <th>Economias</th>
        <th>Escopo</th>
      </tr>
    </thead>
    <tbody>`;

  frentesMap.forEach(f => {
    html += `<tr>
      <td>${f.contrato}</td>
      <td>${f.coordenacao}</td>
      <td>${f.frente}</td>
      <td>${f.tipo}</td>
      <td>${f.inicio}</td>
      <td>${f.linear}</td>
      <td>${f.hidromec}</td>
      <td>${f.eletrica}</td>
      <td>${f.civil}</td>
      <td>${f.entrada}</td>
      <td>${f.economias}</td>
      <td>${f.escopo
}</td>
    </tr>`;
  });

  html += '</tbody></table>';
  document.getElementById('resultado').innerHTML = html;
}

/* =====================================================
   SOMA NUMÉRICA
===================================================== */
function soma(base, campo) {
  return base.reduce((t, d) => {
    const v = Number(d[campo]);
    return t + (isNaN(v) ? 0 : v);
  }, 0);
}

/* =====================================================
   FILTROS
===================================================== */
function popularFiltros(dados) {

  const contratos = new Set();
  const coordenacoes = new Set();
  const meses = new Set();

  dados.forEach(d => {
    if (d.contrato) contratos.add(d.contrato);
    if (d.coordenacao) coordenacoes.add(d.coordenacao);

    const mesAno = extrairMesAno(d.previsaodeinicio);
    if (mesAno) meses.add(mesAno);
  });

  const selContrato = document.getElementById('filtroContrato');
  contratos.forEach(c => {
    selContrato.innerHTML += `<option value="${c}">${c}</option>`;
  });

  const selCoord = document.getElementById('filtroCoordenacao');
  coordenacoes.forEach(c => {
    selCoord.innerHTML += `<option value="${c}">${c}</option>`;
  });

  const selInicio = document.getElementById('filtroInicio');
  Array.from(meses).sort().forEach(m => {
    selInicio.innerHTML += `<option value="${m}">${formatarMesAno(m)}</option>`;
  });
}

function aplicarFiltros() {

  const contrato     = document.getElementById('filtroContrato').value;
  const coordenacao  = document.getElementById('filtroCoordenacao').value;
  const tipo         = document.getElementById('filtroTipo').value;
  const inicio       = document.getElementById('filtroInicio').value;

  const filtrados = dadosGlobais.filter(d => {

    if (contrato && d.contrato !== contrato) return false;
    if (coordenacao && d.coordenacao !== coordenacao) return false;
    if (tipo && d.tipodeobra !== tipo) return false;

    if (inicio) {
      const mesLinha = extrairMesAno(d.previsaodeinicio);
      if (mesLinha !== inicio) return false;
    }

    return true;
  });

  atualizarKPIs(filtrados);
  montarTabela(filtrados);
}

/* =====================================================
   EVENTOS
===================================================== */
document.addEventListener('DOMContentLoaded', () => {

  document.getElementById('filtroContrato').addEventListener('change', aplicarFiltros);
  document.getElementById('filtroCoordenacao').addEventListener('change', aplicarFiltros);
  document.getElementById('filtroTipo').addEventListener('change', aplicarFiltros);
  document.getElementById('filtroInicio').addEventListener('change', aplicarFiltros);

  document.getElementById('limparFiltros').addEventListener('click', () => {
    document.getElementById('filtroContrato').value = '';
    document.getElementById('filtroCoordenacao').value = '';
    document.getElementById('filtroTipo').value = '';
    document.getElementById('filtroInicio').value = '';
    aplicarFiltros();
  });

});
