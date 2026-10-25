// ==============================================
// 🔷 VERSÃO: 2.1 — CORRIGINDO LINK DUPLICADO
// ==============================================
const URL_APPSCRIPT = `https://script.google.com/macros/s/AKfycbzcOiF47DmQZu15Pnytno7IG3CW__8q0ZExrXFwrXT5wyF4kPQXUjq4H4xo8TIyK2Xc9Q/exec`;
// ==============================================

const VERSAO_SISTEMA = '2.1 — 25/10/2026';
const CORES_PADRAO = ['#28a745', '#007bff', '#fd7e14', '#9c27b0', '#e91e63', '#00bcd4'];

let usuarioAtual = null;
let veiculos = [];
let veiculoSelecionado = null;
let mapa = null;
let modoAtual = 'ruas';
let mapaRuas, mapaSatellite;

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ SISTEMA — Versão:', VERSAO_SISTEMA);
  const sessao = sessionStorage.getItem('usuario_logado');
  if (sessao) entrarComoUsuario(sessao);
});

function mostrarCadastro(e) {
  e.preventDefault();
  document.getElementById('form-entrar').classList.add('escondido');
  document.getElementById('form-cadastro').classList.add('visivel');
  limparErros();
}
function mostrarLogin(e) {
  e.preventDefault();
  document.getElementById('form-cadastro').classList.remove('visivel');
  document.getElementById('form-entrar').classList.remove('escondido');
  limparErros();
}
function limparErros() {
  const el1 = document.getElementById('erro-login');
  const el2 = document.getElementById('erro-cadastro');
  if (el1) el1.textContent = '';
  if (el2) el2.textContent = '';
}

async function criarConta() {
  const usuario = document.getElementById('novo-usuario').value.trim();
  const senha = document.getElementById('nova-senha').value;
  const confirma = document.getElementById('confirma-senha').value;
  const erro = document.getElementById('erro-cadastro');

  if (!usuario || usuario.length < 3) {
    erro.textContent = 'Mínimo 3 caracteres no usuário!'; return;
  }
  if (!senha || senha.length < 4) {
    erro.textContent = 'Mínimo 4 caracteres na senha!'; return;
  }
  if (senha !== confirma) {
    erro.textContent = 'Senhas diferentes!'; return;
  }

  try {
    const res = await fetch(URL_APPSCRIPT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ acao: 'criarConta', usuario, senha })
    });
    
    if (!res.ok) throw new Error('Erro ' + res.status);
    const resultado = await res.json();
    
    if (resultado.ok === true) {
      erro.textContent = '✅ Conta criada! Entrando...';
      setTimeout(() => entrarComoUsuario(usuario), 1000);
    } else {
      erro.textContent = '❌ ' + (resultado.msg || 'Erro ao criar conta');
    }
  } catch (err) {
    console.error(err);
    erro.textContent = '⚠️ Erro de conexão. Atualize (Ctrl+F5).';
  }
}

async function fazerLogin() {
  const usuario = document.getElementById('usuario').value.trim();
  const senha = document.getElementById('senha').value;
  const erro = document.getElementById('erro-login');

  if (!usuario || !senha) {
    erro.textContent = 'Preencha tudo!'; return;
  }

  try {
    const res = await fetch(URL_APPSCRIPT);
    if (!res.ok) throw new Error('Erro ' + res.status);
    const dados = await res.json();
    const linhas = dados.dados;
    
    let encontrado = false;
    for (let i = 0; i < linhas.length; i++) {
      if (linhas[i][0] === 'conta' && linhas[i][1] === usuario && linhas[i][2] === senha) {
        encontrado = true;
        break;
      }
    }
    
    if (encontrado) {
      entrarComoUsuario(usuario);
    } else {
      erro.textContent = '❌ Usuário ou senha errados!';
    }
  } catch (err) {
    console.error(err);
    erro.textContent = '⚠️ Erro de conexão!';
  }
}

async function entrarComoUsuario(usuario) {
  usuarioAtual = usuario;
  sessionStorage.setItem('usuario_logado', usuario);
  document.getElementById('tela-login').classList.add('tela-escondida');
  document.getElementById('tela-principal').classList.remove('tela-escondida');
  document.getElementById('nome-usuario-logado').textContent = `👤 ${usuario}`;
  if (!mapa) inicializarMapa();
  await carregarVeiculosDaNuvem();
  renderizarListaVeiculos();
}

function sair() {
  sessionStorage.removeItem('usuario_logado');
  location.reload();
}

function inicializarMapa() {
  mapa = L.map('mapa').setView([-23.8478, -50.1961], 13);
  mapaRuas = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20, subdomains: ['mt0','mt1','mt2','mt3'], attribution: '© Google'
  });
  mapaSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20, subdomains: ['mt0','mt1','mt2','mt3'], attribution: '© Google'
  });
  mapaRuas.addTo(mapa); modoAtual = 'ruas';
}
function trocarMapa(tipo) {
  if (!mapa) return;
  if (tipo === 'ruas' && modoAtual !== 'ruas') {
    mapa.removeLayer(mapaSatellite); mapaRuas.addTo(mapa);
    modoAtual = 'ruas';
    document.getElementById('btnRuas').style.background = '#007bff';
    document.getElementById('btnSat').style.background = '#6c757d';
  }
  if (tipo === 'satellite' && modoAtual !== 'satellite') {
    mapa.removeLayer(mapaRuas); mapaSatellite.addTo(mapa);
    modoAtual = 'satellite';
    document.getElementById('btnSat').style.background = '#007bff';
    document.getElementById('btnRuas').style.background = '#6c757d';
  }
}

async function carregarVeiculosDaNuvem() {
  try {
    const res = await fetch(URL_APPSCRIPT);
    const dados = await res.json();
    const linhas = dados.dados;
    veiculos = [];
    for (let i = 0; i < linhas.length; i++) {
      if (linhas[i][0] === 'veiculo' && linhas[i][1] === usuarioAtual && linhas[i][3]) {
        veiculos.push({
          placa: linhas[i][3],
          nome: linhas[i][4] || linhas[i][3],
          cor: linhas[i][5] || '',
          corMarcador: CORES_PADRAO[veiculos.length % CORES_PADRAO.length],
          lat: null, lon: null, velocidade: 0
        });
      }
    }
  } catch { veiculos = []; }
}

async function salvarVeiculo() {
  const nome = document.getElementById('campo-nome').value.trim();
  const placa = document.getElementById('campo-placa').value.trim().toUpperCase();
  const cor = document.getElementById('campo-cor').value.trim();
  if (!nome || !placa) { alert('Preencha Nome e Placa!'); return; }

  try {
    const res = await fetch(URL_APPSCRIPT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ acao: 'adicionarVeiculo', usuario: usuarioAtual, placa, nomeVeiculo: nome, dados: cor })
    });
    if (!res.ok) throw new Error('Erro');
    await res.json();
    await carregarVeiculosDaNuvem();
    renderizarListaVeiculos();
    atualizarListaCadastro();
    document.getElementById('campo-nome').value = '';
    document.getElementById('campo-placa').value = '';
    document.getElementById('campo-cor').value = '';
    alert('✅ Salvo!');
  } catch { alert('⚠️ Erro ao salvar.'); }
}

function excluirVeiculo(placa) {
  if (!confirm('Tem certeza?')) return;
  veiculos = veiculos.filter(v => v.placa !== placa);
  renderizarListaVeiculos();
  atualizarListaCadastro();
}
function abrirGerenciador() {
  document.getElementById('modal-gerenciar').classList.add('modal-ativo');
  atualizarListaCadastro();
}
function fecharGerenciador() {
  document.getElementById('modal-gerenciar').classList.remove('modal-ativo');
}
function focarNoVeiculo(placa) {
  const v = veiculos.find(x => x.placa === placa);
  if (!v) return;
  veiculoSelecionado = veiculoSelecionado === placa ? null : placa;
  renderizarListaVeiculos();
}
function renderizarListaVeiculos() {
  const c = document.getElementById('lista-veiculos');
  c.innerHTML = '';
  if (veiculos.length === 0) {
    c.innerHTML = `<p class="sem-veiculo">Nenhum veículo.<br>Clique em ➕ Gerenciar Veículos.</p>`;
  } else {
    veiculos.forEach(v => {
      const semSinal = !v.lat || !v.lon;
      const sel = veiculoSelecionado === v.placa;
      const status = semSinal ? '🔄 Aguardando...' : (v.velocidade > 0 ? `✅ ${v.velocidade} km/h` : '⏹ Parado');
      const div = document.createElement('div');
      div.className = `veiculo ${semSinal?'veiculo-sem-sinal':''} ${sel?'veiculo-selecionado':''}`;
      div.style.borderLeft = `4px solid ${v.corMarcador}`;
      div.onclick = () => focarNoVeiculo(v.placa);
      div.innerHTML = `<strong>${sel?'📍 ':''}${v.nome}</strong><br>Placa: ${v.placa}<br>${v.cor?`Cor: ${v.cor}<br>`:''}<span>${status}</span>`;
      c.appendChild(div);
    });
  }
  document.getElementById('ultima-atualizacao').textContent = `Versão ${VERSAO_SISTEMA} | ${new Date().toLocaleString('pt-BR')}`;
}
function atualizarListaCadastro() {
  const c = document.getElementById('lista-cadastro');
  c.innerHTML = '';
  if (veiculos.length === 0) { c.innerHTML = '<p style="color:#888">Nenhum veículo.</p>'; return; }
  veiculos.forEach(v => {
    const div = document.createElement('div');
    div.className = 'item-cadastro';
    div.innerHTML = `<div><strong>${v.nome}</strong><br>${v.placa}${v.cor?` — ${v.cor}`:''}</div><button class="btn-excluir" onclick="excluirVeiculo('${v.placa}')">Excluir</button>`;
    c.appendChild(div);
  });
}