// ==============================================
// 🔷 VERSÃO: 5.2 — CRIAR CONTA SEMPRE VISÍVEL + FUNCIONAL
// ==============================================
const URL_APPSCRIPT = `https://script.google.com/macros/s/AKfycbxdhs27cAFCzgpBhNMxFtxkvloV5hc2OZwDSRS-M9lr_4msAr3cJatVud4zNfDzIMjm/exec`;

// 🔐 DADOS DO ADMINISTRADOR — ALTERE AQUI SE QUISER!
const ADM_USUARIO = `adm`;
const ADM_SENHA = `123456`;
// ==============================================

const VERSAO_SISTEMA = '5.2 — Criar Conta Corrigido';
const CORES_PADRAO = ['#28a745', '#007bff', '#fd7e14', '#9c27b0', '#e91e63', '#00bcd4'];

let usuarioAtual = null;
let ehAdm = false;
let veiculos = [];
let todosUsuarios = [];
let todosVeiculos = [];
let veiculoSelecionado = null;
let mapa = null;
let modoAtual = 'ruas';
let mapaRuas, mapaSatellite;

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ SISTEMA CARREGADO — Versão:', VERSAO_SISTEMA);
  const sessao = sessionStorage.getItem('usuario_logado');
  const ehAdmSessao = sessionStorage.getItem('eh_adm') === 'true';
  if (sessao) {
    ehAdm = ehAdmSessao;
    entrarComoUsuario(sessao);
  }
});

// ✅ FORMULÁRIO ABRE NORMALMENTE PARA TODOS
function mostrarCadastro(e) {
  e.preventDefault();
  document.getElementById('form-entrar').classList.remove('form-visivel');
  document.getElementById('form-entrar').classList.add('form-escondido');
  document.getElementById('form-cadastro').classList.remove('form-escondido');
  document.getElementById('form-cadastro').classList.add('form-visivel');
  limparErros();
  
  // 💡 Avisa logo: só funciona logado como ADM
  const aviso = document.getElementById('erro-cadastro');
  aviso.textContent = ehAdm 
    ? '✅ Você está logado como ADM — pode criar contas!'
    : 'ℹ️ Entre com a conta de ADM primeiro para criar usuários.';
}

function mostrarLogin(e) {
  e.preventDefault();
  document.getElementById('form-cadastro').classList.remove('form-visivel');
  document.getElementById('form-cadastro').classList.add('form-escondido');
  document.getElementById('form-entrar').classList.remove('form-escondido');
  document.getElementById('form-entrar').classList.add('form-visivel');
  limparErros();
}

function limparErros() {
  const el1 = document.getElementById('erro-login');
  const el2 = document.getElementById('erro-cadastro');
  if (el1) el1.textContent = '';
  if (el2) el2.textContent = '';
}

// ✅ CRIAR CONTA — SÓ FUNCIONA SE FOR ADM
async function criarConta() {
  // 🔒 BLOQUEIO REAL: SÓ ADM CONSEGUE SALVAR
  if (!ehAdm) {
    alert('⚠️ Entre primeiro com o usuário e senha de ADM para poder criar contas!');
    mostrarLogin(new Event('click'));
    return;
  }

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
    erro.textContent = 'As senhas não coincidem!'; return;
  }
  if (usuario === ADM_USUARIO) {
    erro.textContent = '❌ Este usuário é reservado para o Administrador!'; return;
  }

  try {
    erro.textContent = 'A processar...';
    const res = await fetch(URL_APPSCRIPT, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({ acao: 'criarConta', usuario, senha })
    });
    
    if (!res.ok) throw new Error('Erro de rede');
    const resultado = await res.json();
    
    if (resultado.ok === true) {
      erro.innerHTML = `✅ <strong>Conta criada com sucesso!</strong><br><br>
        👤 Usuário: <code>${usuario}</code><br>
        🔑 Senha: <code>${senha}</code><br><br>
        📋 Passe estes dados para a pessoa!`;
      document.getElementById('novo-usuario').value = '';
      document.getElementById('nova-senha').value = '';
      document.getElementById('confirma-senha').value = '';
      await carregarDadosCompletos();
    } else {
      erro.textContent = '❌ ' + (resultado.msg || 'Erro ao criar conta');
    }
  } catch (err) {
    console.error(err);
    erro.textContent = '⚠️ Erro de conexão.';
  }
}

// LOGIN
async function fazerLogin() {
  const usuario = document.getElementById('usuario').value.trim();
  const senha = document.getElementById('senha').value;
  const erro = document.getElementById('erro-login');

  if (!usuario || !senha) {
    erro.textContent = 'Preencha todos os campos!'; return;
  }

  try {
    erro.textContent = 'A verificar...';
    
    // 🔑 LOGIN DO ADMINISTRADOR
    if (usuario === ADM_USUARIO && senha === ADM_SENHA) {
      ehAdm = true;
      erro.textContent = '';
      entrarComoUsuario(usuario);
      return;
    }

    // LOGIN DE USUÁRIO COMUM
    const res = await fetch(URL_APPSCRIPT);
    if (!res.ok) throw new Error('Erro de rede');
    const dados = await res.json();
    const linhas = dados.dados;
    
    let encontrado = false;
    for (let i = 1; i < linhas.length; i++) {
      if (linhas[i][0] === 'conta' && linhas[i][1] === usuario && String(linhas[i][2]) === senha) {
        encontrado = true;
        break;
      }
    }
    
    if (encontrado) {
      ehAdm = false;
      erro.textContent = '';
      entrarComoUsuario(usuario);
    } else {
      erro.textContent = '❌ Usuário ou senha incorretos!';
    }
  } catch (err) {
    console.error(err);
    erro.textContent = '⚠️ Erro de conexão.';
  }
}

function entrarComoUsuario(usuario) {
  usuarioAtual = usuario;
  sessionStorage.setItem('usuario_logado', usuario);
  sessionStorage.setItem('eh_adm', ehAdm);
  
  document.getElementById('tela-login').classList.add('tela-escondida');
  document.getElementById('tela-principal').classList.remove('tela-escondida');
  
  document.getElementById('nome-usuario-logado').innerHTML = 
    ehAdm ? `👑 Administrador: ${usuario}` : `👤 Usuário: ${usuario}`;
  
  // 🔒 MOSTRA/OCULTA ELEMENTOS DE ADM
  const painelAdm = document.getElementById('painel-adm');
  const btnGerenciar = document.querySelector('.btn-gerenciar');
  
  if (ehAdm) {
    painelAdm.style.display = 'block';
    btnGerenciar.style.display = 'block';
    carregarDadosCompletos();
  } else {
    painelAdm.style.display = 'none';
    btnGerenciar.style.display = 'none';
    carregarVeiculosDaNuvem();
  }
  
  if (!mapa) inicializarMapa();
}

function sair() {
  sessionStorage.clear();
  location.reload();
}

// 📊 CARREGAR TUDO — APENAS PARA ADM
async function carregarDadosCompletos() {
  try {
    const res = await fetch(URL_APPSCRIPT);
    const dados = await res.json();
    const linhas = dados.dados;
    
    todosUsuarios = [];
    todosVeiculos = [];
    veiculos = [];

    for (let i = 1; i < linhas.length; i++) {
      if (!linhas[i] || !linhas[i][0]) continue;
      
      if (linhas[i][0] === 'conta' && linhas[i][1] !== ADM_USUARIO) {
        todosUsuarios.push({
          nome: linhas[i][1],
          senha: linhas[i][2]
        });
      }
      
      if (linhas[i][0] === 'veiculo' && linhas[i][3]) {
        todosVeiculos.push({
          usuario: linhas[i][1],
          placa: linhas[i][3],
          nome: linhas[i][4] || linhas[i][3],
          cor: linhas[i][5] || ''
        });
      }
    }

    renderizarPainelAdm();
  } catch (err) {
    console.error(err);
  }
}

// CARREGAR APENAS OS PRÓPRIOS VEÍCULOS — USUÁRIO COMUM
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
          cor: linhas[i][5] || '',
          corMarcador: CORES_PADRAO[veiculos.length % CORES_PADRAO.length],
          lat: null, lon: null, velocidade: 0
        });
      }
    }
    renderizarListaVeiculos();
  } catch (err) {
    console.error(err);
    veiculos = [];
  }
}

// 🗑️ EXCLUIR USUÁRIO + VEÍCULOS DELE
async function excluirUsuario(nomeUsuario) {
  if (!ehAdm) return;
  if (!confirm(`Tem certeza que deseja EXCLUIR o usuário "${nomeUsuario}" e TODOS os veículos dele?`)) return;

  try {
    const res = await fetch(URL_APPSCRIPT, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({ acao: 'excluirUsuario', usuario: nomeUsuario })
    });
    if (!res.ok) throw new Error('Erro');
    await res.json();
    await carregarDadosCompletos();
    alert(`✅ Usuário "${nomeUsuario}" removido!`);
  } catch (err) {
    console.error(err);
    alert('⚠️ Erro ao excluir usuário.');
  }
}

// 🗑️ EXCLUIR VEÍCULO
async function excluirVeiculo(placa, usuarioDono) {
  if (!ehAdm) return;
  if (!confirm(`Excluir veículo ${placa} do usuário ${usuarioDono}?`)) return;

  try {
    const res = await fetch(URL_APPSCRIPT, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({ acao: 'excluirVeiculo', usuario: usuarioDono, placa })
    });
    if (!res.ok) throw new Error('Erro');
    await res.json();
    await carregarDadosCompletos();
  } catch (err) {
    console.error(err);
    alert('⚠️ Erro ao excluir veículo.');
  }
}

// 💾 SALVAR VEÍCULO
async function salvarVeiculo() {
  if (!ehAdm) {
    alert('⚠️ Apenas o Administrador pode cadastrar veículos!');
    return;
  }

  const nome = document.getElementById('campo-nome').value.trim();
  const placa = document.getElementById('campo-placa').value.trim().toUpperCase();
  const cor = document.getElementById('campo-cor').value.trim();
  const usuarioDestino = document.getElementById('campo-usuario-dono').value.trim();
  
  if (!nome || !placa || !usuarioDestino) { 
    alert('Preencha Nome, Placa e Usuário!'); 
    return; 
  }
  
  try {
    const res = await fetch(URL_APPSCRIPT, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({ 
        acao: 'adicionarVeiculo', 
        usuario: usuarioDestino,
        placa, 
        nomeVeiculo: nome, 
        dados: cor 
      })
    });
    if (!res.ok) throw new Error('Erro ao salvar');
    
    await res.json();
    document.getElementById('campo-nome').value = '';
    document.getElementById('campo-placa').value = '';
    document.getElementById('campo-cor').value = '';
    document.getElementById('campo-usuario-dono').value = '';
    alert(`✅ Veículo salvo!\nVinculado a: ${usuarioDestino}`);
    await carregarDadosCompletos();
  } catch (err) {
    console.error(err);
    alert('⚠️ Erro ao salvar veículo.');
  }
}

function abrirGerenciador() {
  if (!ehAdm) { alert('⚠️ Apenas o Administrador!'); return; }
  document.getElementById('modal-gerenciar').classList.add('modal-ativo');
}

function fecharGerenciador() {
  document.getElementById('modal-gerenciar').classList.remove('modal-ativo');
}

function focarNoVeiculo(placa) {
  veiculoSelecionado = veiculoSelecionado === placa ? null : placa;
  renderizarListaVeiculos();
}

// 📊 PAINEL COMPLETO DO ADM
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
          Placa: ${v.placa} | Dono: <em>${v.usuario}</em>${v.cor?` | ${v.cor}`:''}
        </div>
        <button class="btn-excluir" onclick="excluirVeiculo('${v.placa}', '${v.usuario}')">🗑️ Excluir</button>
      `;
      listaVeiculosGeral.appendChild(div);
    });
  }

  document.getElementById('ultima-atualizacao').textContent = 
    `Versão ${VERSAO_SISTEMA} | 👑 ADM — Usuários: ${todosUsuarios.length} | Veículos: ${todosVeiculos.length}`;
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
      div.innerHTML = `<strong>${sel?'📍 ':''}${v.nome}</strong><br>Placa: ${v.placa}<br>${v.cor?`Cor: ${v.cor}<br>`:''}<span>${status}</span>`;
      c.appendChild(div);
    });
  }
  
  document.getElementById('ultima-atualizacao').textContent = 
    `Versão ${VERSAO_SISTEMA} | 👤 Usuário Comum`;
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
}

function trocarMapa(tipo) {
  if (!mapa) return;
  if (tipo === 'ruas' && modoAtual !== 'ruas') {
    mapa.removeLayer(mapaSatellite); 
    mapaRuas.addTo(mapa);
    modoAtual = 'ruas';
    document.getElementById('btnRuas').style.background = '#007bff';
    document.getElementById('btnSat').style.background = '#6c757d';
  }
  if (tipo === 'satellite' && modoAtual !== 'satellite') {
    mapa.removeLayer(mapaRuas); 
    mapaSatellite.addTo(mapa);
    modoAtual = 'satellite';
    document.getElementById('btnSat').style.background = '#007bff';
    document.getElementById('btnRuas').style.background = '#6c757d';
  }
}