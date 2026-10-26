// ==============================================
// 🔷 VERSÃO: 8.0 — LAYOUT RESTAURADO ✅
// ==============================================
const URL_APPSCRIPT = `https://script.google.com/macros/s/AKfycbz52MiTuEvj8VFczsaF7ONkilVAheL2S-JkP0mVjpF4wzat2Qo1ySrqUimkVO2qB6gH/exec`;
const ADM_USUARIO = `adm`;
const ADM_SENHA = `123456`;
const VERSAO_SISTEMA = '8.0 — LAYOUT RESTAURADO';
const CORES_PADRAO = ['#28a745', '#007bff', '#fd7e14', '#9c27b0', '#e91e63', '#00bcd4'];
const INTERVALO_ATUALIZACAO = 30000;

console.log('========================================');
console.log('✅ SISTEMA CARREGADO — VERSÃO:', VERSAO_SISTEMA);
console.log('========================================');

let usuarioAtual = null, ehAdm = false, veiculos = [];
let todosUsuarios = [], todosVeiculos = [], veiculoSelecionado = null;
let mapa = null, modoAtual = 'ruas', mapaRuas, mapaSatellite;
let marcadores = {}, rotas = {}, timerAtualizacao = null, ultimaAtualizacao = '--:--';

function abrirFecharPainel() {
  const painel = document.getElementById('painel-adm');
  if (painel) {
    painel.classList.toggle('escondida');
    if (!painel.classList.contains('escondida')) {
      carregarDadosCompletos();
    }
  }
}

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
  
  if (!usuario || !senha) { 
    erro.textContent = 'Preencha todos os campos!'; 
    return; 
  }
  erro.textContent = 'A verificar...';
  
  if (usuario === ADM_USUARIO && senha === ADM_SENHA) {
    ehAdm = true; 
    erro.textContent = '';
    entrarComoUsuario(usuario); 
    return;
  }
  
  fetch(URL_APPSCRIPT)
    .then(r => r.json())
    .then(dados => {
      let ok = false;
      if (!dados.dados) {
        erro.textContent = '⚠️ Formato de dados inválido!';
        return;
      }
      for (let i = 1; i < dados.dados.length; i++) {
        const linha = dados.dados[i];
        if (!linha) continue;
        if (linha[0] === 'conta' && linha[1] === usuario && String(linha[2]) === senha) { 
          ok = true; 
          break; 
        }
      }
      if (ok) { 
        ehAdm = false; 
        erro.textContent = ''; 
        entrarComoUsuario(usuario); 
      } else {
        erro.textContent = '❌ Usuário ou senha incorretos!';
      }
    })
    .catch(err => {
      console.error(err);
      erro.textContent = '⚠️ Erro de conexão. Verifique o Apps Script.';
    });
}

function entrarComoUsuario(usuario) {
  usuarioAtual = usuario;
  sessionStorage.setItem('usuario_logado', usuario);
  sessionStorage.setItem('eh_adm', ehAdm);
  
  const telaLogin = document.getElementById('tela-login');
  const telaPrincipal = document.getElementById('tela-principal');
  
  if (telaLogin) telaLogin.classList.add('escondida');
  if (telaPrincipal) telaPrincipal.classList.remove('escondida');
  
  const nomeUsuario = document.getElementById('nome-usuario-logado');
  if (nomeUsuario) {
    nomeUsuario.textContent = ehAdm ? `👑 Administrador: ${usuario}` : `👤 ${usuario}`;
  }
  
  const btnGerenciar = document.getElementById('btn-gerenciar');
  if (btnGerenciar) {
    btnGerenciar.classList.toggle('escondida', !ehAdm);
  }
  
  if (ehAdm) carregarDadosCompletos();
  else carregarVeiculosDaNuvem();
  
  if (!mapa) inicializarMapa();
  
  setTimeout(() => {
    if (mapa) mapa.invalidateSize(true);
  }, 150);
  
  if (timerAtualizacao) clearInterval(timerAtualizacao);
  atualizarTudo();
  timerAtualizacao = setInterval(atualizarTudo, INTERVALO_ATUALIZACAO);
}

function sair() {
  if (timerAtualizacao) clearInterval(timerAtualizacao);
  sessionStorage.clear();
  location.reload();
}

async function carregarDadosCompletos() {
  try {
    const res = await fetch(URL_APPSCRIPT);
    const dados = await res.json();
    if (!dados.dados) return;
    const linhas = dados.dados;
    
    todosUsuarios = [];
    todosVeiculos = [];
    
    for (let i = 1; i < linhas.length; i++) {
      if (!linhas[i] || !linhas[i][0]) continue;
      if (linhas[i][0] === 'conta' && linhas[i][1] !== ADM_USUARIO) {
        todosUsuarios.push({ nome: linhas[i][1], senha: linhas[i][2] });
      }
      if (linhas[i][0] === 'veiculo') {
        todosVeiculos.push({
          imei: linhas[i][1] || '',
          placa: linhas[i][2] || '',
          nome: linhas[i][3] || linhas[i][2],
          usuario: linhas[i][4] || '',
          dados: linhas[i][5] || ''
        });
      }
    }
    renderizarPainelAdm();
  } catch (err) {
    console.error('❌ Erro:', err);
  }
}

async function carregarVeiculosDaNuvem() {
  try {
    const res = await fetch(URL_APPSCRIPT);
    const dados = await res.json();
    if (!dados.dados) return;
    const linhas = dados.dados;
    veiculos = [];
    
    for (let i = 1; i < linhas.length; i++) {
      if (linhas[i][0] === 'veiculo' && linhas[i][4] === usuarioAtual) {
        veiculos.push({
          imei: linhas[i][1] || '',
          placa: linhas[i][2] || '',
          nome: linhas[i][3] || linhas[i][2],
          cor: linhas[i][5] || '',
          corMarcador: CORES_PADRAO[veiculos.length % CORES_PADRAO.length],
          lat: null, lon: null, velocidade: 0, rota: [],
          kmHoje: 0, km7dias: 0, km30dias: 0
        });
      }
    }
    renderizarListaVeiculos();
  } catch (err) {
    console.error('❌ Erro:', err);
    veiculos = [];
  }
}

async function atualizarTudo() {
  try {
    const res = await fetch(URL_APPSCRIPT);
    const dados = await res.json();
    if (!dados.dados) return;
    const linhas = dados.dados;
    
    const registrosGPS = linhas.filter(l => l && l[0] === 'gps');
    const registrosKM = linhas.filter(l => l && l[0] === 'km_diario');
    
    const hoje = new Date();
    const data7dias = new Date(); data7dias.setDate(hoje.getDate() - 7);
    const data30dias = new Date(); data30dias.setDate(hoje.getDate() - 30);
    const strHoje = hoje.toISOString().split('T')[0];
    
    veiculos.forEach(v => {
      const pontosVeiculo = registrosGPS.filter(g => g[1] === v.imei);
      if (pontosVeiculo.length > 0) {
        const ultimo = pontosVeiculo[pontosVeiculo.length - 1];
        v.lat = Number(ultimo[2]);
        v.lon = Number(ultimo[3]);
        v.velocidade = Number(ultimo[4] || 0);
        v.horario = ultimo[5];
        v.rota = pontosVeiculo.slice(-20).map(g => 
 [Number(g[2]), Number(g[3])]);
        atualizarMarcadorNoMapa(v);
      }
      
      const kmImei = registrosKM.filter(k => k[1] === v.imei);
      v.kmHoje = 0; v.km7dias = 0; v.km30dias = 0;
      
      kmImei.forEach(k => {
        const dataReg = k[2];
        const kmValor = Number(k[3]) || 0;
        if (dataReg === strHoje) v.kmHoje += kmValor;
        const dataObj = new Date(dataReg);
        if (dataObj >= data7dias) v.km7dias += kmValor;
        if (dataObj >= data30dias) v.km30dias += kmValor;
      });
    });
    
    renderizarListaVeiculos();
    ultimaAtualizacao = new Date().toLocaleTimeString('pt-BR');
    
  } catch (err) {
    console.error('⚠️ Erro ao atualizar:', err);
  }
}

function inicializarMapa() {
  const mapaEl = document.getElementById('mapa');
  if (!mapaEl) return;
  
  // Inicializa com posição fixa e estável — sem ajuste automático
  mapa = L.map('mapa', {
    center: [-23.8478, -50.1961],  // Ibaiti - PR
    zoom: 13,
    attributionControl: true
  });
  
  mapaRuas = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20, 
    subdomains: ['mt0','mt1','mt2','mt3'], 
    attribution: '© Google'
  });
  mapaSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20, 
    subdomains: ['mt0','mt1','mt2','mt3'], 
    attribution: '© Google'
  });
  
  mapaRuas.addTo(mapa);
  modoAtual = 'ruas';
  
  // Garante que o mapa se redimensione corretamente
  setTimeout(() => {
    if (mapa) mapa.invalidateSize(true);
  }, 200);
}

function atualizarMarcadorNoMapa(v) {
  if (!mapa || !v.lat || !v.lon) return;
  const pos = [v.lat, v.lon];
  
  if (!marcadores[v.placa]) {
    marcadores[v.placa] = L.marker(pos, {title: v.nome}).addTo(mapa)
      .bindPopup(`
        <strong>${v.nome}</strong><br>
        Placa: ${v.placa}<br>
        Velocidade: ${v.velocidade} km/h<br>
        Atualizado: ${v.horario || '--'}
      `);
  } else {
    marcadores[v.placa].setLatLng(pos);
  }
  
  if (v.rota && v.rota.length > 1) {
    if (!rotas[v.placa]) {
      rotas[v.placa] = L.polyline(v.rota, {color: v.corMarcador, weight: 4, opacity: 0.7}).addTo(mapa);
    } else {
      rotas[v.placa].setLatLngs(v.rota);
    }
  }
}

function focarNoVeiculo(placa) {
  veiculoSelecionado = veiculoSelecionado === placa ? null : placa;
  if (veiculoSelecionado && marcadores[placa]) {
    marcadores[placa].openPopup();
  }
  renderizarListaVeiculos();
}

function renderizarListaVeiculos() {
  const c = document.getElementById('lista-veiculos');
  if (!c) return;
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
      
      div.innerHTML = `
        <strong>${sel?'📍 ':''}${v.nome}</strong><br>
        Placa: ${v.placa}${v.imei?`<br>📡 IMEI: ${v.imei}`:''}<br>
        <span style="color:#666; font-size:12px;">${status}</span>
        <hr style="margin:8px 0; border:none; border-top:1px solid #eee;">
        <div style="font-size:13px; line-height:1.6;">
          <strong>📊 Quilometragem</strong><br>
          📅 Hoje: <strong>${v.kmHoje.toFixed(1)} km</strong><br>
          📆 Últimos 7 Dias: <strong>${v.km7dias.toFixed(1)} km</strong><br>
          📈 Últimos 30 Dias: <strong>${v.km30dias.toFixed(1)} km</strong>
        </div>
      `;
      c.appendChild(div);
    });
  }
  
  const ultEl = document.getElementById('ultima-atualizacao');
  if (ultEl) {
    ultEl.innerHTML = `<strong>${VERSAO_SISTEMA}</strong><br>Última atualização: ${ultimaAtualizacao}`;
  }
}

function renderizarPainelAdm() {
  const listaUsuarios = document.getElementById('lista-todos-usuarios');
  const listaVeiculosGeral = document.getElementById('lista-todos-veiculos');
  if (!listaUsuarios || !listaVeiculosGeral) return;
  
  listaUsuarios.innerHTML = '';
  
  if (todosUsuarios.length === 0) {
    listaUsuarios.innerHTML = '<p style="color:#888">Nenhum usuário cadastrado.</p>';
  } else {
    todosUsuarios.forEach(u => {
      const qtd = todosVeiculos.filter(v => v.usuario === u.nome).length;
      const div = document.createElement('div');
      div.className = 'item-cadastro';
      div.innerHTML = `
        <div>
          <strong>👤 ${u.nome}</strong><br>
          Senha: ${u.senha} | Veículos: ${qtd}
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
          <strong>${v.nome || v.placa}</strong><br>
          Placa: ${v.placa}${v.imei?`<br>📡 IMEI: ${v.imei}`:''}<br>
          Dono: <em>${v.usuario}</em>${v.dados?` | ${v.dados}`:''}
        </div>
        <button class="btn-excluir" onclick="excluirVeiculo('${v.placa}', '${v.usuario}')">🗑️ Excluir</button>
      `;
      listaVeiculosGeral.appendChild(div);
    });
  }
  
  const ultEl = document.getElementById('ultima-atualizacao');
  if (ultEl) {
    ultEl.innerHTML = `<strong>${VERSAO_SISTEMA}</strong><br>👑 ADM — Usuários: ${todosUsuarios.length} | Veículos: ${todosVeiculos.length}`;
  }
}

async function criarConta() {
  if (!ehAdm) { alert('⚠️ Apenas o ADM!'); return; }
  
  const usuario = document.getElementById('novo-usuario')?.value.trim();
  const senha = document.getElementById('nova-senha')?.value;
  const confirma = document.getElementById('confirma-senha')?.value;
  const erro = document.getElementById('erro-cadastro');
  
  if (!usuario || usuario.length < 3) { 
    if (erro) erro.textContent = 'Mínimo 3 caracteres!'; 
    return; 
  }
  if (!senha || senha.length < 4) { 
    if (erro) erro.textContent = 'Mínimo 4 caracteres!'; 
    return; 
  }
  if (senha !== confirma) { 
    if (erro) erro.textContent = 'Senhas diferentes!'; 
    return; 
  }
  if (usuario === ADM_USUARIO) { 
    if (erro) erro.textContent = 'Reservado!'; 
    return; 
  }
  
  if (erro) erro.textContent = 'A processar...';
  const res = await fetch(URL_APPSCRIPT, {
    method: 'POST', 
    headers: {'Content-Type': 'text/plain'},
    body: JSON.stringify({ acao: 'criarConta', usuario, senha })
  });
  const r = await res.json();
  if (r.ok) {
    if (erro) erro.innerHTML = `✅ Conta criada!<br>👤 ${usuario}<br>🔑 ${senha}`;
    const el1 = document.getElementById('novo-usuario');
    const el2 = document.getElementById('nova-senha');
    const el3 = document.getElementById('confirma-senha');
    if (el1) el1.value = '';
    if (el2) el2.value = '';
    if (el3) el3.value = '';
    carregarDadosCompletos();
  } else {
    if (erro) erro.textContent = '❌ ' + (r.msg || 'Erro');
  }
}

async function salvarVeiculo() {
  if (!ehAdm) { alert('⚠️ Apenas o ADM!'); return; }
  
  const nome = document.getElementById('campo-nome')?.value.trim();
  const placa = document.getElementById('campo-placa')?.value.trim().toUpperCase();
  const imei = document.getElementById('campo-imei')?.value.trim();
  const cor = document.getElementById('campo-cor')?.value.trim();
  const dono = document.getElementById('campo-usuario-dono')?.value.trim();
  
  if (!nome || !placa || !imei || !dono) { 
    alert('Preencha Nome, Placa, IMEI e Usuário!'); 
    return; 
  }
  const res = await fetch(URL_APPSCRIPT, {
    method: 'POST',
    headers: {'Content-Type': 'text/plain'},
    body: JSON.stringify({ 
      acao: 'adicionarVeiculo', 
      imei,
      placa, 
      nomeVeiculo: nome, 
      usuario: dono,
      dados: cor 
    })
  });
  const r = await res.json();
  if (r.ok) {
    alert(`✅ Veículo salvo!\nPlaca: ${placa}\nIMEI: ${imei}\nDono: ${dono}`);
    document.getElementById('campo-nome').value = '';
    document.getElementById('campo-placa').value = '';
    document.getElementById('campo-imei').value = '';
    document.getElementById('campo-cor').value = '';
    document.getElementById('campo-usuario-dono').value = '';
    carregarDadosCompletos();
  } else {
    alert('❌ ' + (r.msg || 'Erro'));
  }
}

async function excluirUsuario(nomeUsuario) {
  if (!ehAdm) return;
  if (!confirm(`Tem certeza que deseja excluir o usuário "${nomeUsuario}"?\nTodos os veículos dele também serão removidos!`)) return;
  
  const res = await fetch(URL_APPSCRIPT, {
    method: 'POST',
    headers: {'Content-Type': 'text/plain'},
    body: JSON.stringify({ acao: 'excluirUsuario', usuario: nomeUsuario })
  });
  const r = await res.json();
  if (r.ok) {
    alert('✅ Usuário excluído!');
    carregarDadosCompletos();
  } else {
    alert('❌ ' + (r.msg || 'Erro'));
  }
}

async function excluirVeiculo(placa, usuario) {
  if (!ehAdm) return;
  if (!confirm(`Tem certeza que deseja excluir o veículo "${placa}"?`)) return;
  
  const res = await fetch(URL_APPSCRIPT, {
    method: 'POST',
    headers: {'Content-Type': 'text/plain'},
    body: JSON.stringify({ acao: 'excluirVeiculo', placa, usuario })
  });
  const r = await res.json();
  if (r.ok) {
    alert('✅ Veículo excluído!');
    carregarDadosCompletos();
  } else {
    alert('❌ ' + (r.msg || 'Erro'));
  }
}



