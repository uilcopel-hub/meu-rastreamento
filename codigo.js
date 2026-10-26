// ==============================================
// 🔷 VERSÃO: 7.2 — CAMPO IMEI + PREPARAÇÃO GPS
// ==============================================
const URL_APPSCRIPT = `https://script.google.com/macros/s/AKfycbzfch45960HgLbsFkisYnqzERWg0SVRHKr3ure4lXVzgY8I-o0IUccuNEgmjhZdX5c0QA/exec`;

const ADM_USUARIO = `adm`;
const ADM_SENHA = `123456`;
const VERSAO_SISTEMA = '7.2 — 3 IMEIs cadastrados 📡';
const CORES_PADRAO = ['#28a745', '#007bff', '#fd7e14', '#9c27b0', '#e91e63', '#00bcd4'];

console.log('========================================');
console.log('✅ SISTEMA CARREGADO — VERSÃO:', VERSAO_SISTEMA);
console.log('📅 Data:', new Date().toLocaleString('pt-BR'));
console.log('🚗 IMEIs prontos: 863829078633342 | 863829079607691 | 863829078384698');
console.log('========================================');

let usuarioAtual = null, ehAdm = false, veiculos = [];
let todosUsuarios = [], todosVeiculos = [], veiculoSelecionado = null;
let mapa = null, modoAtual = 'ruas', mapaRuas, mapaSatellite;
let marcadores = {}, rotas = {};

document.addEventListener('DOMContentLoaded', () => {
  const sessao = sessionStorage.getItem('usuario_logado');
  if (sessao) {
    ehAdm = sessionStorage.getItem('eh_adm') === 'true';
    entrarComoUsuario(sessao);
  }
});

function fazerLogin() {
  const usuario = document.getElementById('usuario').value.trim();
  const senha = document.getElementById('senha').value;
  const erro = document.getElementById('erro-login');
  
  if (!usuario || !senha) { erro.textContent = 'Preencha todos os campos!'; return; }
  erro.textContent = 'A verificar...';
  
  if (usuario === ADM_USUARIO && senha === ADM_SENHA) {
    console.log('🔑 Login como ADM');
    ehAdm = true; erro.textContent = '';
    entrarComoUsuario(usuario); return;
  }
  
  fetch(URL_APPSCRIPT).then(r => r.json()).then(dados => {
    let ok = false;
    for (let i = 1; i < dados.dados.length; i++)
      if (dados.dados[i][0] === 'conta' && dados.dados[i][1] === usuario && String(dados.dados[i][2]) === senha) { ok = true; break; }
    if (ok) { ehAdm = false; erro.textContent = ''; entrarComoUsuario(usuario); }
    else erro.textContent = '❌ Usuário ou senha incorretos!';
  }).catch(() => erro.textContent = '⚠️ Erro de conexão.');
}

function entrarComoUsuario(usuario) {
  usuarioAtual = usuario;
  sessionStorage.setItem('usuario_logado', usuario);
  sessionStorage.setItem('eh_adm', ehAdm);
  
  document.querySelector('.tela-login').classList.add('escondida');
  document.querySelector('.tela-principal').classList.remove('escondida');
  document.getElementById('nome-usuario-logado').textContent = 
    ehAdm ? `👑 Administrador: ${usuario}` : `👤 ${usuario}`;
  
  document.getElementById('btn-gerenciar').classList.toggle('escondida', !ehAdm);
  
  if (ehAdm) carregarDadosCompletos();
  else carregarVeiculosDaNuvem();
  
  if (!mapa) inicializarMapa();
}

function sair() { sessionStorage.clear(); location.reload(); }

async function criarConta() {
  if (!ehAdm) { alert('⚠️ Apenas o ADM!'); return; }
  const usuario = document.getElementById('novo-usuario').value.trim();
  const senha = document.getElementById('nova-senha').value;
  const confirma = document.getElementById('confirma-senha').value;
  const erro = document.getElementById('erro-cadastro');
  
  if (!usuario || usuario.length < 3) { erro.textContent = 'Mínimo 3 caracteres!'; return; }
  if (!senha || senha.length < 4) { erro.textContent = 'Mínimo 4 caracteres!'; return; }
  if (senha !== confirma) { erro.textContent = 'Senhas diferentes!'; return; }
  if (usuario === ADM_USUARIO) { erro.textContent = 'Reservado!'; return; }
  
  erro.textContent = 'A processar...';
  const res = await fetch(URL_APPSCRIPT, {
    method: 'POST', headers: {'Content-Type': 'text/plain'},
    body: JSON.stringify({ acao: 'criarConta', usuario, senha })
  });
  const r = await res.json();
  if (r.ok) {
    erro.innerHTML = `✅ Conta criada!<br>👤 ${usuario}<br>🔑 ${senha}`;
    document.getElementById('novo-usuario').value = '';
    document.getElementById('nova-senha').value = '';
    document.getElementById('confirma-senha').value = '';
    carregarDadosCompletos();
  } else erro.textContent = '❌ ' + (r.msg || 'Erro');
}

async function salvarVeiculo() {
  if (!ehAdm) { alert('⚠️ Apenas o ADM!'); return; }
  const nome = document.getElementById('campo-nome').value.trim();
  const placa = document.getElementById('campo-placa').value.trim().toUpperCase();
  const imei = document.getElementById('campo-imei').value.trim();
  const cor = document.getElementById('campo-cor').value.trim();
  const dono = document.getElementById('campo-usuario-dono').value.trim();
  
  if (!nome || !placa || !dono) { alert('Preencha Nome, Placa e Usuário!'); return; }
  
  console.log('🚙 Salvando veículo:', placa, 'IMEI:', imei, '→ Dono:', dono);
  const res = await fetch(URL_APPSCRIPT, {
    method: 'POST', headers: {'Content-Type': 'text/plain'},
    body: JSON.stringify({ 
      acao: 'adicionarVeiculo', 
      usuario: dono, 
      placa, 
      nomeVeiculo: nome, 
      imei: imei,
      dados: cor 
    })
  });
  const r = await res.json();
  if (r.ok) {
    alert(`✅ Veículo salvo!\nPlaca: ${placa}\nIMEI: ${imei || 'Não informado'}\nDono: ${dono}`);
    document.getElementById('campo-nome').value = '';
    document.getElementById('campo-placa').value = '';
    document.getElementById('campo-imei').value = '';
    document.getElementById('campo-cor').value = '';
    document.getElementById('campo-usuario-dono').value = '';
    carregarDadosCompletos();
  } else alert('❌ ' + (r.msg || 'Erro'));
}

async function carregarDadosCompletos() {
  try {
    const res = await fetch(URL_APPSCRIPT);
    const dados = await res.json();
    const linhas = dados.dados;
    
    todosUsuarios = [];
    todosVeiculos = [];
    
    for (let i = 1; i < linhas.length; i++) {
      if (!linhas[i] || !linhas[i][0]) continue;
      if (linhas[i][0] === 'conta' && linhas[i][1] !== ADM_USUARIO) {
        todosUsuarios.push({ nome: linhas[i][1], senha: linhas[i][2] });
      }
      if (linhas[i][0] === 'veiculo' && linhas[i][3]) {
        todosVeiculos.push({
          usuario: linhas[i][1],
          placa: linhas[i][3],
          nome: linhas[i][4] || linhas[i][3],
          imei: linhas[i][6] || '',
          cor: linhas[i][5] || ''
        });
      }
    }
    console.log('📊 Usuários:', todosUsuarios.length, 'Veículos:', todosVeiculos.length);
    renderizarPainelAdm();
  } catch (err) {
    console.error('❌ Erro:', err);
  }
}

async function carregarVeiculosDaNuvem() {
  try {
    const res = await fetch(URL_APPSCRIPT);
    const dados = await res.json();
    const linhas = dados.dados;
    veiculos = [];
    
    for (let i = 1; i < linhas.length; i++) {
      if (linhas[i][0] === 'veiculo' && linhas[i][1] === usuarioAtual && linhas[i][3]) {
        veiculos.push({
          placa: linhas[i][3],
          nome: linhas[i][4] || linhas[i][3],
          imei: linhas[i][6] || '',
          cor: linhas[i][5] || '',
          corMarcador: CORES_PADRAO[veiculos.length % CORES_PADRAO.length],
          lat: null, lon: null, velocidade: 0, rota: []
        });
      }
    }
    renderizarListaVeiculos();
  } catch (err) {
    console.error('❌ Erro:', err);
    veiculos = [];
  }
}

async function excluirUsuario(nomeUsuario) {
  if (!ehAdm) return;
  if (!confirm(`Tem certeza que deseja EXCLUIR o usuário "${nomeUsuario}" e TODOS os veículos dele?`)) return;

  const res = await fetch(URL_APPSCRIPT, {
    method: 'POST', headers: {'Content-Type': 'text/plain'},
    body: JSON.stringify({ acao: 'excluirUsuario', usuario: nomeUsuario })
  });
  await res.json();
  await carregarDadosCompletos();
  alert(`✅ Usuário "${nomeUsuario}" removido!`);
}

async function excluirVeiculo(placa, usuarioDono) {
  if (!ehAdm) return;
  if (!confirm(`Excluir veículo ${placa} do usuário ${usuarioDono}?`)) return;

  const res = await fetch(URL_APPSCRIPT, {
    method: 'POST', headers: {'Content-Type': 'text/plain'},
    body: JSON.stringify({ acao: 'excluirVeiculo', usuario: usuarioDono, placa })
  });
  await res.json();
  await carregarDadosCompletos();
}

function abrirGerenciador() {
  if (!ehAdm) { alert('⚠️ Apenas o Administrador!'); return; }
  document.getElementById('modal-gerenciar').classList.add('modal-ativo');
  document.getElementById('erro-cadastro').textContent = '';
}

function fecharGerenciador() {
  document.getElementById('modal-gerenciar').classList.remove('modal-ativo');
  document.getElementById('erro-cadastro').textContent = '';
}

function focarNoVeiculo(placa) {
  veiculoSelecionado = veiculoSelecionado === placa ? null : placa;
  renderizarListaVeiculos();
}

function renderizarPainelAdm() {
  const listaUsuarios = document.getElementById('lista-todos-usuarios');
  const listaVeiculosGeral = document.getElementById('lista-todos-veiculos');

  listaUsuarios.innerHTML = '';
  if (todosUsuarios.length === 0) {
    listaUsuarios.innerHTML = '<p style="color:#888">Nenhum usuário cadastrado.</p>';
  } else {
    todosUsuarios.forEach(u => {
      const qtdVeic = todosVeiculos.filter(v => v.usuario === u.nome).length;
      const div = document.createElement('div');
      div.className = 'item-cadastro';
      div.innerHTML = `
        <div>
          <strong>👤 ${u.nome}</strong><br>
          Senha: ${u.senha} | Veículos: ${qtdVeic}
        </div>
        <button class="btn-excluir" onclick="excluirUsuario('${u.nome}')">🗑️ Excluir</button>
      `;
      listaUsuarios.appendChild(div);
    });
  }

  listaVeiculosGeral.innerHTML = '';
  if (todosVeiculos.length === 0) {
    listaVeiculosGeral.innerHTML = '<p style="color:#888">Nenhum veículo cadastrado.</p>';
  } else {
    todosVeiculos.forEach(v => {
      const div = document.createElement('div');
      div.className = 'item-cadastro';
      div.innerHTML = `
        <div>
          <strong>${v.nome}</strong><br>
          Placa: ${v.placa}${v.imei?`<br>📡 IMEI: ${v.imei}`:''}<br>
          Dono: <em>${v.usuario}</em>${v.cor?` | ${v.cor}`:''}
        </div>
        <button class="btn-excluir" onclick="excluirVeiculo('${v.placa}', '${v.usuario}')">🗑️ Excluir</button>
      `;
      listaVeiculosGeral.appendChild(div);
    });
  }

  document.getElementById('ultima-atualizacao').innerHTML = 
    `<strong>${VERSAO_SISTEMA}</strong><br>👑 ADM — Usuários: ${todosUsuarios.length} | Veículos: ${todosVeiculos.length}`;
}

function renderizarListaVeiculos() {
  const c = document.getElementById('lista-veiculos');
  c.innerHTML = '';
  
  if (veiculos.length === 0) {
    c.innerHTML = `<p class="sem-veiculo">Nenhum veículo vinculado.<br>Aguarde o administrador.</p>`;
  } else {
    veiculos.forEach(v => {
      const semSinal = !v.lat || !v.lon;
      const sel = veiculoSelecionado === v.placa;
      const status = semSinal ? '🔄 Aguardando sinal...' : (v.velocidade > 0 ? `✅ ${v.velocidade} km/h` : '⏹ Parado');
      
      const div = document.createElement('div');
      div.className = `veiculo ${semSinal?'veiculo-sem-sinal':''} ${sel?'veiculo-selecionado':''}`;
      div.style.borderLeft = `4px solid ${v.corMarcador}`;
      div.onclick = () => focarNoVeiculo(v.placa);
      div.innerHTML = `<strong>${sel?'📍 ':''}${v.nome}</strong><br>Placa: ${v.placa}${v.imei?`<br>📡 IMEI: ${v.imei}`:''}<br>${v.cor?`Cor: ${v.cor}<br>`:''}<span>${status}</span>`;
      c.appendChild(div);
    });
  }
  
  document.getElementById('ultima-atualizacao').innerHTML = 
    `<strong>${VERSAO_SISTEMA}</strong><br>👤 Usuário Comum`;
}

function inicializarMapa() {
  mapa = L.map('mapa').setView([-23.8478, -50.1961], 13);
  mapaRuas = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20, subdomains: ['mt0','mt1','mt2','mt3'], attribution: '© Google'
  });
  mapaSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20, subdomains: ['mt0','mt1','mt2','mt3'], attribution: '© Google'
  });
  mapaRuas.addTo(mapa); 
  modoAtual = 'ruas';
  console.log('🗺️ Mapa inicializado');
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
  console.log('🗺️ Tipo mapa:', modoAtual);
}