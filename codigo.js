// ==============================================
// SISTEMA RASTREAMENTO — Versão: 15.2
// ==============================================
const VERSAO_SISTEMA = "✅ SISTEMA RASTREAMENTO — Versão: 15.2";
const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzcOiF47DmQZu15Pnytno7IG3CW__8q0ZExrXFwrXT5wyF4kPQXUjq4H4xo8TIyK2Xc9Q/exec";
const USUARIO_ADM = "adm";
const SENHA_ADM = "123456";

let mapa = null;
let camadas = { ruas: null, satelite: null };
let veiculosDoUsuario = [];
let todosVeiculos = [];
let todosUsuarios = [];
let usuarioAtual = null;
let ehAdm = false;
let veiculoSelecionado = null;
let veiculoSeguido = null;
let veiculoDetalheAberto = null;
let marcadores = {};
let rotas = {};
let ultimaAtualizacao = "--:--";

// Inicializar mapa
function inicializarMapa() {
  if (mapa) return;
  
  mapa = L.map('mapa', { zoomControl: true }).setView([-24.7, -50.6], 10);
  
  camadas.ruas = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  });
  
  camadas.satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri'
  });
  
  camadas.ruas.addTo(mapa);
}

function trocarMapa(tipo) {
  if (tipo === 'ruas') {
    mapa.removeLayer(camadas.satelite);
    mapa.addLayer(camadas.ruas);
    document.getElementById('btnRuas').classList.add('ativo');
    document.getElementById('btnSat').classList.remove('ativo');
  } else {
    mapa.removeLayer(camadas.ruas);
    mapa.addLayer(camadas.satelite);
    document.getElementById('btnSat').classList.add('ativo');
    document.getElementById('btnRuas').classList.remove('ativo');
  }
}

// Login
async function fazerLogin() {
  const usuario = document.getElementById('usuario').value.trim();
  const senha = document.getElementById('senha').value;
  const erroEl = document.getElementById('erro-login');
  
  if (!usuario || !senha) {
    erroEl.textContent = "Preencha todos os campos!";
    return;
  }
  
  // Verificar se é ADM
  if (usuario === USUARIO_ADM && senha === SENHA_ADM) {
    usuarioAtual = usuario;
    ehAdm = true;
    await carregarTodosDados();
    entrarTelaPrincipal();
    return;
  }
  
  // Verificar usuário comum na planilha
  try {
    const resp = await fetch(URL_SCRIPT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'verificarLogin', usuario, senha })
    });
    
    // Como usamos no-cors, fazemos leitura completa
    const leitura = await fetch(URL_SCRIPT + '?t=' + Date.now());
    const dados = await leitura.json();
    
    const conta = dados.dados?.find(linha => 
      linha[0] === 'conta' && linha[1] === usuario && linha[2] === senha
    );
    
    if (!conta) {
      erroEl.textContent = "Usuário ou senha incorretos!";
      return;
    }
    
    usuarioAtual = usuario;
    ehAdm = false;
    await carregarDadosUsuario();
    entrarTelaPrincipal();
    
  } catch (erro) {
    erroEl.textContent = "Erro de conexão. Tente novamente.";
    console.error(erro);
  }
}

async function carregarDadosUsuario() {
  try {
    const resp = await fetch(URL_SCRIPT + '?t=' + Date.now());
    const dados = await resp.json();
    
    veiculosDoUsuario = (dados.dados || [])
      .filter(linha => linha[0] === 'veiculo' && linha[1] === usuarioAtual)
      .map(linha => ({
        placa: linha[3],
        nome: linha[4],
        imei: linha[5] || '',
        usuario: linha[1],
        lat: null, lon: null, velocidade: 0,
        kmHoje: 0, km7dias: 0, km30dias: 0,
        corMarcador: '#28a745'
      }));
  } catch (e) {
    console.error(e);
  }
}

async function carregarTodosDados() {
  try {
    const resp = await fetch(URL_SCRIPT + '?t=' + Date.now());
    const dados = await resp.json();
    
    todosUsuarios = (dados.dados || []).filter(l => l[0] === 'conta');
    todosVeiculos = (dados.dados || [])
      .filter(linha => linha[0] === 'veiculo')
      .map(linha => ({
        placa: linha[3],
        nome: linha[4],
        imei: linha[5] || '',
        usuario: linha[1],
        lat: null, lon: null, velocidade: 0,
        kmHoje: 0, km7dias: 0, km30dias: 0,
        corMarcador: '#007bff'
      }));
    
    veiculosDoUsuario = todosVeiculos;
  } catch (e) {
    console.error(e);
  }
}

function entrarTelaPrincipal() {
  document.getElementById('tela-login').classList.add('escondida');
  document.getElementById('tela-principal').classList.remove('escondida');
  document.getElementById('nome-usuario-logado').textContent = usuarioAtual + (ehAdm ? ' 👑' : '');
  
  if (ehAdm) {
    document.getElementById('btn-gerenciar').classList.remove('escondida');
  }
  
  inicializarMapa();
  renderizarListaVeiculos();
  if (ehAdm) renderizarPainelAdm();
}

function sair() {
  usuarioAtual = null;
  ehAdm = false;
  veiculosDoUsuario = [];
  todosVeiculos = [];
  todosUsuarios = [];
  
  Object.values(marcadores).forEach(m => mapa?.removeLayer(m));
  marcadores = {};
  
  document.getElementById('tela-login').classList.remove('escondida');
  document.getElementById('tela-principal').classList.add('escondida');
  document.getElementById('cartao-detalhes').classList.remove('aberto');
}

// CARTÃO DE DETALHES
function focarNoVeiculo(placa) {
  if (veiculoDetalheAberto === placa) {
    fecharCartao();
    return;
  }
  
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
  
  const btnSeguir = document.getElementById('btn-seguir-cartao');
  const ehSeguindo = veiculoSeguido === placa;
  btnSeguir.textContent = ehSeguindo ? '📍 Seguindo' : '📍 Seguir no mapa';
  btnSeguir.classList.toggle('seguindo', ehSeguindo);
  
  if (marcadores[placa] && mapa) {
    mapa.setView(marcadores[placa].getLatLng(), 15);
    marcadores[placa].openPopup();
  }
  veiculoSelecionado = placa;
  
  document.getElementById('cartao-detalhes').classList.add('aberto');
  renderizarListaVeiculos();
}

function fecharCartao() {
  veiculoDetalheAberto = null;
  document.getElementById('cartao-detalhes').classList.remove('aberto');
  veiculoSelecionado = null;
  renderizarListaVeiculos();
}

function alternarSeguirAtual() {
  if (!veiculoDetalheAberto) return;
  veiculoSeguido = veiculoSeguido === veiculoDetalheAberto ? null : veiculoDetalheAberto;
  
  const btnSeguir = document.getElementById('btn-seguir-cartao');
  const ehSeguindo = veiculoSeguido === veiculoDetalheAberto;
  btnSeguir.textContent = ehSeguindo ? '📍 Seguindo' : '📍 Seguir no mapa';
  btnSeguir.classList.toggle('seguindo', ehSeguindo);
}

function renderizarListaVeiculos() {
  const listaEl = document.getElementById('lista-veiculos');
  if (!listaEl) return;
  listaEl.innerHTML = '';
  const listaDados = ehAdm ? todosVeiculos : veiculosDoUsuario;
  
  if (listaDados.length === 0) {
    listaEl.innerHTML = '<p class="sem-veiculo">Nenhum veículo vinculado.<br>Aguarde o administrador.</p>';
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
      <small style="color:#666; display:block;">${semSinal ? 'Sem sinal' : (v.velocidade > 0 ? 'Em movimento' : 'Parado')}</small>
    `;
    listaEl.appendChild(div);
  });
  
  const ultEl = document.getElementById('ultima-atualizacao');
  if (ultEl) {
    ultEl.innerHTML = `<strong>${VERSAO_SISTEMA}</strong><br>Última: ${ultimaAtualizacao}`;
  }
}

// PAINEL ADMIN
function abrirFecharPainel() {
  const painel = document.getElementById('painel-adm');
  painel.classList.toggle('escondida');
  if (!painel.classList.contains('escondida')) {
    renderizarPainelAdm();
  }
}

function renderizarPainelAdm() {
  if (!ehAdm) return;
  carregarTodosDados(); // recarregar
  
  const listaUsuarios = document.getElementById('lista-todos-usuarios');
  listaUsuarios.innerHTML = '';
  todosUsuarios.forEach(u => {
    const div = document.createElement('div');
    div.className = 'item-cadastro';
    div.innerHTML = `
      <span><strong>${u[1]}</strong></span>
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
        <small>Placa: ${v.placa} | Dono: ${v.usuario}</small>
      </div>
      <button class="btn-excluir" onclick="excluirVeiculo('${v.placa}')">🗑️ Excluir</button>
    `;
    listaTodosVeic.appendChild(div);
  });
}

async function criarConta() {
  const usuario = document.getElementById('novo-usuario').value.trim();
  const senha = document.getElementById('nova-senha').value;
  const confirma = document.getElementById('confirma-senha').value;
  const erroEl = document.getElementById('erro-cadastro');
  
  if (!usuario || !senha) {
    erroEl.textContent = "Preencha todos os campos!";
    return;
  }
  if (senha.length < 4) {
    erroEl.textContent = "Senha com mínimo 4 caracteres!";
    return;
  }
  if (senha !== confirma) {
    erroEl.textContent = "As senhas não coincidem!";
    return;
  }
  
  try {
    await fetch(URL_SCRIPT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'criarConta', usuario, senha })
    });
    
    document.getElementById('novo-usuario').value = '';
    document.getElementById('nova-senha').value = '';
    document.getElementById('confirma-senha').value = '';
    erroEl.textContent = "✅ Conta criada com sucesso!";
    erroEl.style.color = '#28a745';
    renderizarPainelAdm();
    
  } catch (erro) {
    erroEl.textContent = "Erro ao criar conta!";
  }
}

async function salvarVeiculo() {
  const nome = document.getElementById('campo-nome').value.trim();
  const placa = document.getElementById('campo-placa').value.trim();
  const imei = document.getElementById('campo-imei').value.trim();
  const cor = document.getElementById('campo-cor').value.trim();
  const dono = document.getElementById('campo-usuario-dono').value.trim();
  
  if (!nome || !placa || !dono) {
    alert("Preencha Nome, Placa e Usuário DONO!");
    return;
  }
  
  try {
    await fetch(URL_SCRIPT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'adicionarVeiculo', usuario: dono, nome, placa, imei, cor })
    });
    
    document.getElementById('campo-nome').value = '';
    document.getElementById('campo-placa').value = '';
    document.getElementById('campo-imei').value = '';
    document.getElementById('campo-cor').value = '';
    document.getElementById('campo-usuario-dono').value = '';
    
    alert("✅ Veículo cadastrado!");
    renderizarPainelAdm();
    renderizarListaVeiculos();
    
  } catch (erro) {
    alert("Erro ao cadastrar veículo!");
  }
}

async function excluirUsuario(nomeUsuario) {
  if (!confirm(`Excluir o usuário "${nomeUsuario}" e TODOS os veículos dele?`)) return;
  
  try {
    await fetch(URL_SCRIPT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'excluirUsuario', usuario: nomeUsuario })
    });
    alert("✅ Usuário e veículos excluídos!");
    renderizarPainelAdm();
    renderizarListaVeiculos();
  } catch {
    alert("Erro ao excluir!");
  }
}

async function excluirVeiculo(placa) {
  if (!confirm(`Excluir o veículo "${placa}"?`)) return;
  
  try {
    await fetch(URL_SCRIPT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'excluirVeiculo', placa })
    });
    alert("✅ Veículo excluído!");
    renderizarPainelAdm();
    renderizarListaVeiculos();
  } catch {
    alert("Erro ao excluir!");
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  console.log(VERSAO_SISTEMA);
});