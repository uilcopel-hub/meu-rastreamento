// ==============================================
// SISTEMA RASTREAMENTO — Versão: 24 ✅
// COLUNAS: A=tipo | B=usuario | C=senha | D=placa | E=imei | F=nome | G=cor | H=lat | I=lon | J=velocidade | K=kmHoje | L=km7dias | M=km30dias
// ==============================================
const VERSAO_SISTEMA = "✅ SISTEMA RASTREAMENTO — Versão: 24";
const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzyQyLHIISlIbnH2T_Gdq6s2hYLU9rSifp8DEU2pwUhvORyBN50wrDL6QPUbFTw9Y0M/exec";
const USUARIO_ADM = "adm";
const SENHA_ADM = "123456";
const CORES_PADRAO = ['#28a745', '#007bff', '#fd7e14', '#9c27b0', '#e91e63', '#00bcd4'];

console.log(VERSAO_SISTEMA);

let mapa = null;
let modoAtual = 'ruas';
let mapaRuas = null;
let mapaSatellite = null;
let veiculosDoUsuario = [];
let todosVeiculos = [];
let todosUsuarios = [];
let usuarioAtual = null;
let ehAdm = false;
let veiculoDetalheAberto = null;
let marcadores = {};

function mostrarVersaoLogin() {
  const el = document.getElementById('versao-sistema');
  if (el) el.textContent = VERSAO_SISTEMA;
}

function inicializarMapa() {
  if (mapa) return;
  const centro = [-24.7, -50.6];
  mapa = L.map('mapa').setView(centro, 10);
  mapaRuas = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20, subdomains: ['mt0','mt1','mt2','mt3'], attribution: '© Google'
  });
  mapaSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20, subdomains: ['mt0','mt1','mt2','mt3'], attribution: '© Google'
  });
  mapaRuas.addTo(mapa);
  modoAtual = 'ruas';
}

function trocarMapa(tipo) {
  if (!mapa) return;
  if (tipo === 'ruas' && modoAtual !== 'ruas') {
    mapa.removeLayer(mapaSatellite);
    mapaRuas.addTo(mapa);
    modoAtual = 'ruas';
    document.getElementById('btnRuas').classList.add('ativo');
    document.getElementById('btnSat').classList.remove('ativo');
  }
  if (tipo === 'satellite' && modoAtual !== 'satellite') {
    mapa.removeLayer(mapaRuas);
    mapaSatellite.addTo(mapa);
    modoAtual = 'satellite';
    document.getElementById('btnSat').classList.add('ativo');
    document.getElementById('btnRuas').classList.remove('ativo');
  }
}

async function buscarDados() {
  try {
    const resposta = await fetch(URL_SCRIPT + '?t=' + Date.now());
    if (!resposta.ok) throw new Error("Erro");
    return await resposta.json();
  } catch (erro) {
    console.error(erro);
    return { dados: [] };
  }
}

async function fazerLogin() {
  const usuario = document.getElementById('usuario').value.trim();
  const senha = document.getElementById('senha').value;
  const erroEl = document.getElementById('erro-login');
  
  if (!usuario || !senha) {
    erroEl.textContent = "Preencha todos os campos!";
    return;
  }
  
  if (usuario === USUARIO_ADM && senha === SENHA_ADM) {
    usuarioAtual = usuario;
    ehAdm = true;
    await carregarTodosDados();
    entrarTelaPrincipal();
    return;
  }
  
  const dados = await buscarDados();
  const conta = dados.dados?.find(linha => 
    linha[0] === 'conta' && linha[1] === usuario && String(linha[2]) === senha
  );
  
  if (!conta) {
    erroEl.textContent = "Usuário ou senha incorretos!";
    return;
  }
  
  usuarioAtual = usuario;
  ehAdm = false;
  await carregarDadosUsuario(dados);
  entrarTelaPrincipal();
}

async function carregarDadosUsuario(dados = null) {
  if (!dados) dados = await buscarDados();
  
  veiculosDoUsuario = (dados.dados || [])
    .filter(linha => linha[0] === 'veiculo' && String(linha[1]).trim() === usuarioAtual)
    .map((linha, idx) => ({
      tipo: linha[0],
      usuario: String(linha[1]).trim(),
      placa: String(linha[3] || '').trim(),
      imei: String(linha[4] || '').trim(),
      nome: String(linha[5] || linha[3] || '').trim(),
      cor: String(linha[6] || '').trim(),
      lat: linha[7] || null,
      lon: linha[8] || null,
      velocidade: linha[9] || 0,
      kmHoje: linha[10] || 0,
      km7dias: linha[11] || 0,
      km30dias: linha[12] || 0,
      horario: '--:--',
      corMarcador: CORES_PADRAO[idx % CORES_PADRAO.length]
    }));
}

async function carregarTodosDados() {
  const dados = await buscarDados();
  todosUsuarios = (dados.dados || []).filter(l => l[0] === 'conta');
  todosVeiculos = (dados.dados || [])
    .filter(linha => linha[0] === 'veiculo')
    .map((linha, idx) => ({
      tipo: linha[0],
      usuario: String(linha[1]).trim(),
      placa: String(linha[3] || '').trim(),
      imei: String(linha[4] || '').trim(),
      nome: String(linha[5] || linha[3] || '').trim(),
      cor: String(linha[6] || '').trim(),
      lat: linha[7] || null,
      lon: linha[8] || null,
      velocidade: linha[9] || 0,
      kmHoje: linha[10] || 0,
      km7dias: linha[11] || 0,
      km30dias: linha[12] || 0,
      horario: '--:--',
      corMarcador: CORES_PADRAO[idx % CORES_PADRAO.length]
    }));
  veiculosDoUsuario = todosVeiculos;
}

async function entrarTelaPrincipal() {
  document.getElementById('tela-login').classList.add('escondida');
  document.getElementById('tela-principal').classList.remove('escondida');
  document.getElementById('nome-usuario-logado').textContent = usuarioAtual + (ehAdm ? ' 👑' : '');
  if (ehAdm) document.getElementById('btn-gerenciar').classList.remove('escondida');
  inicializarMapa();
  renderizarListaVeiculos();
  if (ehAdm) renderizarPainelAdm();
}

function sair() {
  usuarioAtual = null; ehAdm = false;
  veiculosDoUsuario = []; todosVeiculos = []; todosUsuarios = [];
  Object.values(marcadores).forEach(m => mapa?.removeLayer(m));
  marcadores = {};
  sessionStorage.clear();
  document.getElementById('tela-login').classList.remove('escondida');
  document.getElementById('tela-principal').classList.add('escondida');
  document.getElementById('cartao-detalhes').classList.remove('aberto');
}



function focarNoVeiculo(placa) {
  if (veiculoDetalheAberto === placa) { fecharCartao(); return; }
  veiculoDetalheAberto = placa;
  const listaDados = ehAdm ? todosVeiculos : veiculosDoUsuario;
  const v = listaDados.find(x => x.placa === placa);
  if (!v) return;
  
  document.getElementById('cartao-nome').textContent = v.nome || v.placa;
  document.getElementById('cartao-placa').textContent = v.placa;
  document.getElementById('cartao-imei').textContent = v.imei || 'Não informado';
  
  const donoLinha = document.getElementById('cartao-dono-linha');
  if (ehAdm) {
    donoLinha.textContent = `👤 Dono: ${v.usuario}`;
    donoLinha.style.display = 'block';
  } else {
    donoLinha.style.display = 'none';
  }
  
  document.getElementById('cartao-km-hoje').textContent = v.kmHoje.toFixed(1) + ' km';
  document.getElementById('cartao-km-7dias').textContent = v.km7dias.toFixed(1) + ' km';
  document.getElementById('cartao-km-30dias').textContent = v.km30dias.toFixed(1) + ' km';
  
  const semSinal = !v.lat || !v.lon;
  document.getElementById('cartao-status').textContent = semSinal ? '🔄 Aguardando sinal...' : (v.velocidade > 0 ? '✅ Em movimento' : '⏹ Parado');
  document.getElementById('cartao-velocidade').textContent = semSinal ? '--' : v.velocidade + ' km/h';
  document.getElementById('cartao-horario').textContent = v.horario || '--:--';
  
  if (!semSinal && mapa) {
    if (!marcadores[placa]) marcadores[placa] = L.marker([v.lat, v.lon]).addTo(mapa);
    else marcadores[placa].setLatLng([v.lat, v.lon]);
    mapa.setView([v.lat, v.lon], 15);
  }
  
  document.getElementById('cartao-detalhes').classList.add('aberto');
  renderizarListaVeiculos();
}

function fecharCartao() {
  veiculoDetalheAberto = null;
  document.getElementById('cartao-detalhes').classList.remove('aberto');
  renderizarListaVeiculos();
}

function alternarSeguirAtual() {
  // Função de seguir no mapa
}

function renderizarListaVeiculos() {
  const listaEl = document.getElementById('lista-veiculos');
  if (!listaEl) return;
  listaEl.innerHTML = '';
  const listaDados = ehAdm ? todosVeiculos : veiculosDoUsuario;
  
  if (listaDados.length === 0) {
    listaEl.innerHTML = '<p class="sem-veiculo">Nenhum veículo vinculado.<br>Aguarde o administrador cadastrar.</p>';
    return;
  }
  
  listaDados.forEach(v => {
    const ehSelecionado = veiculoDetalheAberto === v.placa;
    const semSinal = !v.lat || !v.lon;
    const div = document.createElement('div');
    div.className = `veiculo ${semSinal?'veiculo-sem-sinal':''} ${ehSelecionado?'selecionado':''}`;
    div.style.borderLeft = `4px solid ${v.corMarcador}`;
    div.onclick = () => focarNoVeiculo(v.placa);
    div.innerHTML = `
      <strong>${v.nome || v.placa}</strong>
      <small style="color:#666">${semSinal ? 'Sem sinal' : (v.velocidade > 0 ? 'Em movimento' : 'Parado')}</small>
    `;
    listaEl.appendChild(div);
  });
  
  const ultEl = document.getElementById('ultima-atualizacao');
  if (ultEl) ultEl.innerHTML = `<strong>${VERSAO_SISTEMA}</strong>`;
}

function abrirFecharPainel() {
  const painel = document.getElementById('painel-adm');
  painel.classList.toggle('escondida');
  if (!painel.classList.contains('escondida')) {
    carregarTodosDados();
    renderizarPainelAdm();
  }
}

function renderizarPainelAdm() {
  if (!ehAdm) return;
  const listaUsuarios = document.getElementById('lista-todos-usuarios');
  listaUsuarios.innerHTML = '';
  todosUsuarios.forEach(u => {
    if (u[1] === USUARIO_ADM) return;
    const qtd = todosVeiculos.filter(v => v.usuario === u[1]).length;
    const div = document.createElement('div');
    div.className = 'item-cadastro';
    div.innerHTML = `
      <span><strong>${u[1]}</strong><br><small>Senha: ${u[2]} | Veículos: ${qtd}</small></span>
      <button class="btn-excluir" onclick="excluirUsuario('${u[1]}')">🗑️ Excluir</button>
    `;
    listaUsuarios.appendChild(div);
  });
  
  const listaTodosVeic = document.getElementById('lista-todos-veiculos');
  listaTodosVeic.innerHTML = '';
  todosVeiculos.forEach(v => {
    const div = document.createElement('div');
    div.className = 'item-cadastro';
    div.innerHTML = `
      <div>
        <strong>${v.nome || v.placa}</strong><br>
        <small>Placa: ${v.placa} | IMEI: ${v.imei} | Dono: ${v.usuario}</small>
      </div>
      <button class="btn-excluir" onclick="excluirVeiculo('${v.placa}')">🗑️ Excluir</button>
    `;
    listaTodosVeic.appendChild(div);
  });
}

async function criarConta() {
  if (!ehAdm) { alert("Apenas o administrador!"); return; }
  const usuario = document.getElementById('novo-usuario').value.trim();
  const senha = document.getElementById('nova-senha').value;
  if (!usuario || !senha) { alert("Preencha tudo!"); return; }
  
  const resposta = await fetch(URL_SCRIPT, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({acao:'criarConta', usuario, senha})
  });
  const res = await resposta.json();
  if (res.ok) {
    alert("✅ Conta criada!");
    document.getElementById('novo-usuario').value = '';
    document.getElementById('nova-senha').value = '';
    carregarTodosDados();
    renderizarPainelAdm();
  } else {
    alert("❌ " + (res.erro || "Erro!"));
  }
}

async function salvarVeiculo() {
  if (!ehAdm) return;
  const usuario = document.getElementById('campo-usuario-dono').value.trim();
  const placa = document.getElementById('campo-placa').value.trim();
  const imei = document.getElementById('campo-imei').value.trim();
  const nome = document.getElementById('campo-nome').value.trim();
  const cor = document.getElementById('campo-cor').value.trim();
  
  if (!usuario || !placa || !imei || !nome) {
    alert("Preencha os campos obrigatórios!");
    return;
  }
  
  const resposta = await fetch(URL_SCRIPT, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      acao: 'adicionarVeiculo',
      usuario,
      placa,
      imei,
      nome,
      cor
    })
  });
  
  const res = await resposta.json();
  if (res.ok) {
    alert("✅ Veículo adicionado!");
    document.getElementById('campo-placa').value = '';
    document.getElementById('campo-imei').value = '';
    document.getElementById('campo-nome').value = '';
    document.getElementById('campo-cor').value = '';
    document.getElementById('campo-usuario-dono').value = '';
    carregarTodosDados();
    renderizarPainelAdm();
  } else {
    alert("❌ " + (res.erro || "Erro ao adicionar!"));
  }
}

async function excluirUsuario(nomeUsuario) {
  if (!confirm(`Tem certeza que deseja excluir o usuário "${nomeUsuario}" e todos os veículos dele?`)) {
    return;
  }
  
  const resposta = await fetch(URL_SCRIPT, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      acao: 'excluirUsuario',
      usuario: nomeUsuario
    })
  });
  
  const res = await resposta.json();
  if (res.ok) {
    alert("✅ Usuário e veículos excluídos!");
    carregarTodosDados();
    renderizarPainelAdm();
  } else {
    alert("❌ " + (res.erro || "Erro ao excluir!"));
  }
}

async function excluirVeiculo(placa) {
  if (!confirm(`Tem certeza que deseja excluir o veículo com placa "${placa}"?`)) {
    return;
  }
  
  const resposta = await fetch(URL_SCRIPT, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      acao: 'excluirVeiculo',
      placa: placa
    })
  });
  
  const res = await resposta.json();
  if (res.ok) {
    alert("✅ Veículo excluído!");
    carregarTodosDados();
    renderizarPainelAdm();
    if (veiculoDetalheAberto === placa) {
      fecharCartao();
    }
  } else {
    alert("❌ " + (res.erro || "Erro ao excluir!"));
  }
}

window.onload = function() {
  mostrarVersaoLogin();
};