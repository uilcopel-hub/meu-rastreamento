// ==============================================
// SISTEMA RASTREAMENTO — Versão: 61  ✅
// COLUNAS: A=tipo | B=usuario | C=senha | D=placa | E=imei | F=nome | G=cor | H=lat | I=lon | J=velocidade | K=kmHoje | L=km7dias | M=km30dias | N=horario | O=cerca_ativa | P=cerca_lat_lon | Q=cerca_raio
// ==============================================
const VERSAO_SISTEMA = "✅ SISTEMA RASTREAMENTO — UIL TELLES: 61";
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
let veiculosSeguidos = {}; 
let timerAtualizacao = null;
let historicoRotas = {}; 
let linhasRotas = {};    
let cercasVirtuais = {}; 

let camadaRotaHistorico = null;
let marcadoresParadasHistorico = [];
let dadosHistoricoCarregados = [];

// ✅ Variáveis de controlo para saber se estamos a editar
let usuarioEditandoOriginal = null;
let placaEditandoOriginal = null;


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

  tornarArrastavel('cartao-detalhes'); 
  tornarArrastavel('painel-principal'); 
}

function traduzirCor(corStr) {
  if (!corStr) return '#007bff';
  const cor = String(corStr).trim().toLowerCase();
  
  const mapaCores = {
    'azul': '#007bff',
    'vermelho': '#dc3545',
    'verde': '#28a745',
    'amarelo': '#ffc107',
    'laranja': '#fd7e14',
    'roxo': '#6f42c1',
    'rosa': '#e83e8c',
    'cinza': '#6c757d',
    'preto': '#343a40',
    'branco': '#ffffff'
  };

  if (mapaCores[cor]) return mapaCores[cor];
  return corStr; 
}

function criarIconeCarroSimples(cor = '#007bff') {
  const corFinal = traduzirCor(cor);
  const htmlIcono = `
    <div style="background-color: ${corFinal}; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 6px rgba(0,0,0,0.4); border: 2px solid white;">
      <span style="font-size: 16px; line-height: 1;">🚗</span>
    </div>
  `;

  return L.divIcon({
    className: '', 
    html: htmlIcono,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
}

function abrirGoogleMapsVeiculo() {
  if (!veiculoDetalheAberto) {
    alert("Selecione um veículo primeiro!");
    return;
  }
  
  const listaDados = ehAdm ? todosVeiculos : veiculosDoUsuario;
  const v = listaDados.find(x => x.placa === veiculoDetalheAberto);
  
  if (!v || !v.lat || !v.lon) {
    alert("Este veículo não possui coordenadas válidas no momento!");
    return;
  }
  
  const nomeVeiculo = encodeURIComponent(`${v.nome || 'Veículo'} (${v.placa})`);
  const urlMaps = `https://www.google.com/maps/search/?api=1&query=${v.lat},${v.lon}&query_place_id=${nomeVeiculo}`;
  window.open(urlMaps, '_blank');
}

function focarNoVeiculoECentralizar(placa) {
  const listaDados = ehAdm ? todosVeiculos : veiculosDoUsuario;
  const v = listaDados.find(x => x.placa === placa);
  if (v && v.lat && v.lon && mapa) {
    const corVeiculo = v.cor || v.corMarcador || '#007bff';
    const icone = criarIconeCarroSimples(corVeiculo);

    if (!marcadores[placa]) {
      marcadores[placa] = L.marker([v.lat, v.lon], { icon: icone }).addTo(mapa);
    } else {
      marcadores[placa].setLatLng([v.lat, v.lon]);
      marcadores[placa].setIcon(icone);
    }
    mapa.setView([v.lat, v.lon], 18);
  }
}

function atualizarTodosMarcadoresNoMapa() {
  if (!mapa) return;
  const listaDados = ehAdm ? todosVeiculos : veiculosDoUsuario;
  
  listaDados.forEach(v => {
    if (v.lat && v.lon) {
      const lat = parseFloat(v.lat);
      const lon = parseFloat(v.lon);
      if (isNaN(lat) || isNaN(lon)) return;

      const corVeiculo = v.cor || v.corMarcador || '#007bff';
      const icone = criarIconeCarroSimples(corVeiculo);

      if (!marcadores[v.placa]) {
        marcadores[v.placa] = L.marker([lat, lon], { icon: icone }).addTo(mapa);
        marcadores[v.placa].on('click', () => focarNoVeiculo(v.placa));
      } else {
        marcadores[v.placa].setLatLng([lat, lon]);
        marcadores[v.placa].setIcon(icone);
      }
      
      const textoTooltip = `🚗 ${v.nome || v.placa} (Dono: ${v.usuario || 'N/A'}) — ${v.velocidade || 0} km/h`;
      marcadores[v.placa].bindTooltip(textoTooltip, {direction: 'top'});
    }
  });

  sincronizarCercasNoMapa(listaDados);
}

function sincronizarCercasNoMapa(listaDados) {
  if (!mapa) return;

  listaDados.forEach(v => {
    const placa = v.placa;

    if (v.cercaAtiva && v.cercaLatLon) {
      const partes = v.cercaLatLon.split(',');
      if (partes.length === 2) {
        const latCentro = parseFloat(partes[0]);
        const lonCentro = parseFloat(partes[1]);
        const raio = v.cercaRaio || 200;

        if (!cercasVirtuais[placa] || !cercasVirtuais[placa].ativo) {
          let circulo = L.circle([latCentro, lonCentro], {
            color: '#007bff',
            fillColor: '#007bff',
            fillOpacity: 0.15,
            radius: raio
          }).addTo(mapa);

          cercasVirtuais[placa] = {
            ativo: true,
            latCentro: latCentro,
            lonCentro: lonCentro,
            raio: raio,
            violado: false,
            horarioViolacao: '',
            objetoCirculo: circulo
          };
        }
      }
    } else {
      if (cercasVirtuais[placa] && cercasVirtuais[placa].ativo) {
        if (cercasVirtuais[placa].objetoCirculo) {
          mapa.removeLayer(cercasVirtuais[placa].objetoCirculo);
        }
        delete cercasVirtuais[placa];
      }
    }
  });

  if (veiculoDetalheAberto) {
    atualizarEstadoBotaoCerca(veiculoDetalheAberto);
  }
}

function atualizarEstadoBotaoCerca(placa) {
  const btnCerca = document.getElementById('btn-cerca-cartao');
  const avisoContainer = document.getElementById('aviso-cerca-container');
  const textoAviso = document.getElementById('texto-aviso-cerca');
  
  if (!btnCerca) return;

  if (cercasVirtuais[placa] && cercasVirtuais[placa].ativo) {
    btnCerca.style.background = "#dc3545";
    btnCerca.textContent = "🛡️ Desativar Cerca";
    
    if (cercasVirtuais[placa].violado && avisoContainer) {
      textoAviso.textContent = `Cerca violada às ${cercasVirtuais[placa].horarioViolacao}`;
      avisoContainer.style.display = 'block';
    }
  } else {
    btnCerca.style.background = "#6c757d";
    btnCerca.textContent = "🛡️ Ativar Cerca";
    if (avisoContainer) avisoContainer.style.display = 'none';
  }
}

function atualizarEstadoBotaoSeguir(placa) {
  const btn = document.getElementById('btn-seguir-cartao');
  if (!btn) return;
  
  if (veiculosSeguidos[placa]) {
    btn.classList.add('seguindo');
    btn.style.background = "#dc3545";
    btn.textContent = "🛑 Parar de seguir";
  } else {
    btn.classList.remove('seguindo');
    btn.style.background = "";
    btn.textContent = "📍 Seguir no mapa";
  }
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

function tornarArrastavel(idElemento, idCabecalho) {
  const el = document.getElementById(idElemento);
  if (!el) return;
  const handle = document.getElementById(idCabecalho) || el;
  
  let posX = 0, posY = 0, mouseX = 0, mouseY = 0;

  handle.onpointerdown = function(e) {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
    
    e.preventDefault();
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    document.onpointerup = fecharArrasto;
    document.onpointermove = moverElemento;
  };

  function moverElemento(e) {
    e.preventDefault();
    posX = mouseX - e.clientX;
    posY = mouseY - e.clientY;
    mouseX = e.clientX;
    mouseY = e.clientY;

    el.style.top = (el.offsetTop - posY) + "px";
    el.style.left = (el.offsetLeft - posX) + "px";
    el.style.bottom = "auto";
    el.style.right = "auto";
  }

  function fecharArrasto() {
    document.onpointerup = null;
    document.onpointermove = null;
  }
}

async function buscarDados() {
  try {
    const resposta = await fetch(URL_SCRIPT + '?t=' + Date.now());
    if (!resposta.ok) throw new Error("Erro ao buscar dados");
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
  
  erroEl.textContent = "";
  const btnEntrar = document.querySelector('#tela-login button'); 
  const textoOriginal = btnEntrar ? btnEntrar.textContent : "Entrar";
  
  if (btnEntrar) {
    btnEntrar.disabled = true;
    btnEntrar.textContent = "⏳ A entrar, aguarde...";
    btnEntrar.style.opacity = "0.7";
  }

  try {
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
      if (btnEntrar) {
        btnEntrar.disabled = false;
        btnEntrar.textContent = textoOriginal;
        btnEntrar.style.opacity = "1";
      }
      return;
    }
    
    usuarioAtual = usuario;
    ehAdm = false;
    await carregarDadosUsuario(dados);
    entrarTelaPrincipal();
    
  } catch (erro) {
    console.error(erro);
    erroEl.textContent = "Erro ao conectar ao servidor.";
    if (btnEntrar) {
      btnEntrar.disabled = false;
      btnEntrar.textContent = textoOriginal;
      btnEntrar.style.opacity = "1";
    }
  }
}

async function carregarDadosUsuario(dados = null) {
  if (!dados) dados = await buscarDados();
  
  veiculosDoUsuario = (dados.dados || [])
    .filter(linha => linha && linha[0] === 'veiculo' && String(linha[1]).trim() === usuarioAtual)
    .map((linha, idx) => ({
      tipo: linha[0],
      usuario: String(linha[1] || '').trim(),
      placa: String(linha[3] || '').trim(),
      imei: String(linha[4] || '').trim(),
      nome: String(linha[5] || linha[3] || '').trim(),
      cor: String(linha[6] || '').trim(),
      lat: linha[7] ? parseFloat(linha[7]) : null,
      lon: linha[8] ? parseFloat(linha[8]) : null,
      velocidade: linha[9] ? parseFloat(linha[9]) : 0,
      kmHoje: linha[10] ? parseFloat(linha[10]) : 0,
      km7dias: linha[11] ? parseFloat(linha[11]) : 0,
      km30dias: linha[12] ? parseFloat(linha[12]) : 0,
      horario: linha[13] || '--:--', 
      cercaAtiva: linha[14] === true || linha[14] === 'true',
      cercaLatLon: String(linha[15] || '').trim(),
      cercaRaio: linha[16] ? parseFloat(linha[16]) : 200,
      corMarcador: CORES_PADRAO[idx % CORES_PADRAO.length]
    }));
}

async function carregarTodosDados() {
  const dados = await buscarDados();
  todosUsuarios = (dados.dados || []).filter(l => l && l[0] === 'conta');
  todosVeiculos = (dados.dados || [])
    .filter(linha => linha && linha[0] === 'veiculo')
    .map((linha, idx) => ({
      tipo: linha[0],
      usuario: String(linha[1] || '').trim(),
      placa: String(linha[3] || '').trim(),
      imei: String(linha[4] || '').trim(),
      nome: String(linha[5] || linha[3] || '').trim(),
      cor: String(linha[6] || '').trim(),
      lat: linha[7] ? parseFloat(linha[7]) : null,
      lon: linha[8] ? parseFloat(linha[8]) : null,
      velocidade: linha[9] ? parseFloat(linha[9]) : 0,
      kmHoje: linha[10] ? parseFloat(linha[10]) : 0,
      km7dias: linha[11] ? parseFloat(linha[11]) : 0,
      km30dias: linha[12] ? parseFloat(linha[12]) : 0,
      horario: linha[13] || '--:--', 
      cercaAtiva: linha[14] === true || linha[14] === 'true',
      cercaLatLon: String(linha[15] || '').trim(),
      cercaRaio: linha[16] ? parseFloat(linha[16]) : 200,
      corMarcador: CORES_PADRAO[idx % CORES_PADRAO.length]
    }));
  veiculosDoUsuario = todosVeiculos;
}

async function entrarTelaPrincipal() {
  document.getElementById('tela-login').classList.add('escondida');
  document.getElementById('tela-principal').classList.remove('escondida');
  document.getElementById('nome-usuario-logado').textContent = usuarioAtual + (ehAdm ? ' 👑' : '');
  
  const btnGerenciar = document.getElementById('btn-gerenciar');
  if (ehAdm) {
    btnGerenciar.classList.remove('escondida');
  } else {
    btnGerenciar.classList.add('escondida');
  }

  inicializarMapa();
  atualizarTodosMarcadoresNoMapa();
  renderizarListaVeiculos();

  const listaDados = ehAdm ? todosVeiculos : veiculosDoUsuario;
  if (listaDados.length > 0 && listaDados[0].lat && listaDados[0].lon) {
    mapa.setView([listaDados[0].lat, listaDados[0].lon], 13);
  }

  if (ehAdm) renderizarPainelAdm();

  if (timerAtualizacao) clearInterval(timerAtualizacao);
  timerAtualizacao = setInterval(atualizarPosicoesEmTempoReal, 10000);
}

async function atualizarPosicoesEmTempoReal() {
  if (!usuarioAtual) return;
  
  if (ehAdm) {
    await carregarTodosDados();
  } else {
    await carregarDadosUsuario();
  }
  
  renderizarListaVeiculos();
  atualizarTodosMarcadoresNoMapa();

  if (veiculoDetalheAberto) {
    const listaDados = ehAdm ? todosVeiculos : veiculosDoUsuario;
    const v = listaDados.find(x => x.placa === veiculoDetalheAberto);
    
    if (v) {
      document.getElementById('cartao-km-hoje').textContent = (Number(v.kmHoje) || 0).toFixed(1) + ' km';
      document.getElementById('cartao-km-7dias').textContent = (Number(v.km7dias) || 0).toFixed(1) + ' km';
      document.getElementById('cartao-km-30dias').textContent = (Number(v.km30dias) || 0).toFixed(1) + ' km';
      
      const semSinal = !v.lat || !v.lon;
      document.getElementById('cartao-status').textContent = semSinal ? '🔄 Aguardando sinal...' : (v.velocidade > 0 ? '✅ Em movimento' : '⏹ Parado');
      document.getElementById('cartao-velocidade').textContent = semSinal ? '--' : (v.velocidade || 0) + ' km/h';
      document.getElementById('cartao-horario').textContent = v.horario || '--:--';
      
      if (!semSinal) {
        verificarCercaVirtual(v);
      }
      
      if (!semSinal && mapa) {
        const placa = v.placa;
        if (!historicoRotas[placa]) {
          historicoRotas[placa] = [];
        }
        
        const ultimoPonto = historicoRotas[placa][historicoRotas[placa].length - 1];
        if (!ultimoPonto || ultimoPonto[0] !== v.lat || ultimoPonto[1] !== v.lon) {
          historicoRotas[placa].push([v.lat, v.lon]);
        }

        if (veiculosSeguidos[placa]) {
          mapa.setView([v.lat, v.lon], 18);

          if (!linhasRotas[placa]) {
            linhasRotas[placa] = L.polyline(historicoRotas[placa], { 
              color: '#007bff', 
              weight: 5, 
              opacity: 0.8 
            }).addTo(mapa);
          } else {
            linhasRotas[placa].setLatLngs(historicoRotas[placa]);
          }
        } else {
          if (linhasRotas[placa]) {
            mapa.removeLayer(linhasRotas[placa]);
            delete linhasRotas[placa];
          }
        }
      }
    }
  }
}

function sair() {
  usuarioAtual = null; 
  ehAdm = false;
  veiculosSeguidos = {}; 
  
  if (timerAtualizacao) {
    clearInterval(timerAtualizacao);
    timerAtualizacao = null;
  }
  
  veiculosDoUsuario = []; 
  todosVeiculos = []; 
  todosUsuarios = [];
  
  Object.values(marcadores).forEach(m => mapa?.removeLayer(m));
  marcadores = {};
  sessionStorage.clear();
  
  limparHistoricoMapa();

  const campoUsuario = document.getElementById('usuario');
  const campoSenha = document.getElementById('senha');
  if (campoUsuario) campoUsuario.value = '';
  if (campoSenha) campoSenha.value = '';

  const btnEntrar = document.querySelector('#tela-login button');
  if (btnEntrar) {
    btnEntrar.disabled = false;
    btnEntrar.textContent = "Entrar";
    btnEntrar.style.opacity = "1";
  }

  const erroEl = document.getElementById('erro-login');
  if (erroEl) erroEl.textContent = "";

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
  if (donoLinha) {
    donoLinha.innerHTML = `👤 <b>Dono/Usuário:</b> ${v.usuario || 'Não informado'}`;
    donoLinha.style.display = 'block';
  }
  
  document.getElementById('cartao-km-hoje').textContent = (Number(v.kmHoje) || 0).toFixed(1) + ' km';
  document.getElementById('cartao-km-7dias').textContent = (Number(v.km7dias) || 0).toFixed(1) + ' km';
  document.getElementById('cartao-km-30dias').textContent = (Number(v.km30dias) || 0).toFixed(1) + ' km';
  
  const semSinal = !v.lat || !v.lon;
  document.getElementById('cartao-status').textContent = semSinal ? '🔄 Aguardando sinal...' : (v.velocidade > 0 ? '✅ Em movimento' : '⏹ Parado');
  document.getElementById('cartao-velocidade').textContent = semSinal ? '--' : (v.velocidade || 0) + ' km/h';
  document.getElementById('cartao-horario').textContent = v.horario || '--:--';
  
  atualizarEstadoBotaoCerca(placa);
  atualizarEstadoBotaoSeguir(placa);

  if (!semSinal && mapa) {
    const corVeiculo = v.cor || v.corMarcador || '#007bff';
    const icone = criarIconeCarroSimples(corVeiculo);

    if (!marcadores[placa]) marcadores[placa] = L.marker([v.lat, v.lon], { icon: icone }).addTo(mapa);
    else {
      marcadores[placa].setLatLng([v.lat, v.lon]);
      marcadores[placa].setIcon(icone);
    }
    mapa.setView([v.lat, v.lon], 18);
  }
  
  document.getElementById('cartao-detalhes').classList.add('aberto');
  renderizarListaVeiculos();
}

function fecharCartao() {
  veiculoDetalheAberto = null;
  limparHistoricoMapa();
  document.getElementById('cartao-detalhes').classList.remove('aberto');
  renderizarListaVeiculos();
}

function alternarSeguirAtual() {
  if (!veiculoDetalheAberto) {
    alert("Selecione um veículo primeiro!");
    return;
  }
  
  const placa = veiculoDetalheAberto;
  veiculosSeguidos[placa] = !veiculosSeguidos[placa];
  
  atualizarEstadoBotaoSeguir(placa);
  
  if (veiculosSeguidos[placa]) {
    focarNoVeiculoECentralizar(placa);
  }
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
    
    let statusTexto = semSinal ? 'Sem sinal' : (v.velocidade > 0 ? 'Em movimento' : 'Parado');
    let classeStatus = semSinal ? 'status-cinza' : (v.velocidade > 0 ? 'status-verde' : 'status-amarelo');

    if (v.horario && v.horario !== '--:--') {
      try {
        const partes = v.horario.split(':');
        const agora = new Date();
        const dataMsg = new Date();
        dataMsg.setHours(parseInt(partes[0]), parseInt(partes[1]), parseInt(partes[2] || 0), 0);
        
        let diffMs = agora - dataMsg;
        if (diffMs < 0) {
          diffMs += 24 * 60 * 60 * 1000;
        }
        
        const diffMinutos = diffMs / 1000 / 60;
        
        if (diffMinutos > 30) {
          const dias = Math.floor(diffMinutos / 1440);
          const horas = Math.floor((diffMinutos % 1440) / 60);
          const minutos = Math.round(diffMinutos % 60);
          
          if (dias > 0) {
            statusTexto = `⚠️ Inativo (${dias}d ${horas}h)`;
          } else if (horas > 0) {
            statusTexto = `⚠️ Inativo (${horas}h ${minutos}m)`;
          } else {
            statusTexto = `⚠️ Inativo (${minutos} min)`;
          }
          classeStatus = 'status-vermelho';
        }
      } catch (e) {}
    }

    const div = document.createElement('div');
    div.className = `veiculo ${semSinal?'veiculo-sem-sinal':''} ${ehSelecionado?'selecionado':''}`;
    div.style.borderLeft = `4px solid ${v.corMarcador || '#007bff'}`;
    div.onclick = () => focarNoVeiculo(v.placa);
    
    const iconeVeiculo = '🚗'; 

    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 16px; margin-right: 6px;">${iconeVeiculo}</span>
          <strong>${v.nome || v.placa}</strong>
        </div>
        <small class="badge-status ${classeStatus}">${statusTexto}</small>
      </div>
      <div style="font-size: 11px; color: #666; margin-top: 4px; display: flex; justify-content: space-between;">
        <span>Placa: <b>${v.placa}</b></span>
        <span>Dono: <b>${v.usuario || 'N/A'}</b></span>
      </div>
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

// ✅ RENDERIZA OS PAINÉIS DE ADMINISTRAÇÃO COM BOTÕES DINÂMICOS
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
      <div style="display: flex; gap: 4px;">
        <button class="btn-editar" style="background: #ffc107; color: #000; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px;" onclick="preencherEdicaoUsuario('${u[1]}', '${u[2]}')">✏️ Editar</button>
        <button class="btn-excluir" onclick="excluirUsuario('${u[1]}')">🗑️ Excluir</button>
      </div>
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
      <div style="display: flex; gap: 4px;">
        <button class="btn-editar" style="background: #ffc107; color: #000; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px;" onclick="preencherEdicaoVeiculo('${v.placa}')">✏️ Editar</button>
        <button class="btn-excluir" onclick="excluirVeiculo('${v.placa}')">🗑️ Excluir</button>
      </div>
    `;
    listaTodosVeic.appendChild(div);
  });
}

// ✏️ PREENCHE OS CAMPOS DE USUÁRIO PARA EDITAR E MUDA O TEXTO DO BOTÃO PARA SALVAR
function preencherEdicaoUsuario(usuario, senha) {
  usuarioEditandoOriginal = usuario; // Guarda quem estamos a editar
  document.getElementById('novo-usuario').value = usuario;
  document.getElementById('nova-senha').value = senha;
  const confSenha = document.getElementById('confirma-senha');
  if (confSenha) confSenha.value = senha;
  
  // Muda o texto do botão de criar para salvar conta
  const btnCriar = document.querySelector("button[onclick='criarConta()']");
  if (btnCriar) btnCriar.textContent = "💾 Salvar Conta";

  document.getElementById('novo-usuario').focus();
}

// ✏️ PREENCHE OS CAMPOS DO VEÍCULO PARA EDITAR E MUDA O TEXTO DO BOTÃO PARA SALVAR
function preencherEdicaoVeiculo(placa) {
  const v = todosVeiculos.find(item => item.placa === placa);
  if (!v) return;

  placaEditandoOriginal = placa; // Guarda a placa original para atualizar corretamente

  document.getElementById('campo-nome').value = v.nome || '';
  document.getElementById('campo-placa').value = v.placa || '';
  document.getElementById('campo-imei').value = v.imei || '';
  document.getElementById('campo-cor').value = v.cor || '';
  document.getElementById('campo-usuario-dono').value = v.usuario || '';

  // Muda o texto do botão para Salvar Veículo
  const btnSalvar = document.querySelector("button[onclick='salvarVeiculo()']");
  if (btnSalvar) btnSalvar.textContent = "💾 Salvar Veículo";

  document.getElementById('campo-nome').focus();
}

async function criarConta() {
  if (!ehAdm) { alert("Apenas o administrador!"); return; }
  const usuario = document.getElementById('novo-usuario').value.trim();
  const senha = document.getElementById('nova-senha').value;
  if (!usuario || !senha) { alert("Preencha tudo!"); return; }
  
  // Se estamos a editar, exclui o registo antigo primeiro para não duplicar
  if (usuarioEditandoOriginal && usuarioEditandoOriginal !== usuario) {
    await fetch(URL_SCRIPT, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({acao:'excluirUsuario', usuario: usuarioEditandoOriginal})
    });
  }

  const resposta = await fetch(URL_SCRIPT, {
    method: 'POST',
    headers: {'Content-Type': 'text/plain;charset=utf-8'},
    body: JSON.stringify({acao:'criarConta', usuario, senha})
  });
  const res = await resposta.json();
  if (res.ok) {
    alert(usuarioEditandoOriginal ? "✅ Conta atualizada com sucesso!" : "✅ Conta criada com sucesso!");
    
    // Reseta o modo de edição
    usuarioEditandoOriginal = null;
    document.getElementById('novo-usuario').value = '';
    document.getElementById('nova-senha').value = '';
    const confSenha = document.getElementById('confirma-senha');
    if (confSenha) confSenha.value = '';
    
    const btnCriar = document.querySelector("button[onclick='criarConta()']");
    if (btnCriar) btnCriar.textContent = "✅ Criar Conta";

    await new Promise(resolve => setTimeout(resolve, 1000));
    await carregarTodosDados();
    renderizarPainelAdm();
    renderizarListaVeiculos();
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
  
  // Se estivermos a editar e a placa mudou (ou mantiver), removemos a antiga primeiro para atualizar sem duplicar
  if (placaEditandoOriginal) {
    await fetch(URL_SCRIPT, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({acao:'excluirVeiculo', placa: placaEditandoOriginal})
    });
  }

  const resposta = await fetch(URL_SCRIPT, {
    method: 'POST',
    headers: {'Content-Type': 'text/plain;charset=utf-8'},
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
    alert(placaEditandoOriginal ? "✅ Veículo atualizado com sucesso!" : "✅ Veículo adicionado com sucesso!");
    
    // Reseta o modo de edição
    placaEditandoOriginal = null;
    document.getElementById('campo-placa').value = '';
    document.getElementById('campo-imei').value = '';
    document.getElementById('campo-nome').value = '';
    document.getElementById('campo-cor').value = '';
    document.getElementById('campo-usuario-dono').value = '';
    
    const btnSalvar = document.querySelector("button[onclick='salvarVeiculo()']");
    if (btnSalvar) btnSalvar.textContent = "💾 Salvar Veículo";

    await new Promise(resolve => setTimeout(resolve, 1000));
    await carregarTodosDados();
    renderizarPainelAdm();
    renderizarListaVeiculos();
  } else {
    alert("❌ " + (res.erro || "Erro ao salvar!"));
  }
}

async function excluirUsuario(nomeUsuario) {
  if (!confirm(`Tem certeza que deseja excluir o usuário "${nomeUsuario}" e todos os veículos dele?`)) {
    return;
  }
  
  const resposta = await fetch(URL_SCRIPT, {
    method: 'POST',
    headers: {'Content-Type': 'text/plain;charset=utf-8'},
    body: JSON.stringify({
      acao: 'excluirUsuario',
      usuario: nomeUsuario
    })
  });
  
  const res = await resposta.json();
  if (res.ok) {
    alert("✅ Usuário e veículos excluídos!");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    await carregarTodosDados();
    renderizarPainelAdm();
    renderizarListaVeiculos();
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
    headers: {'Content-Type': 'text/plain;charset=utf-8'},
    body: JSON.stringify({
      acao: 'excluirVeiculo',
      placa: placa
    })
  });
  
  const res = await resposta.json();
  if (res.ok) {
    alert("✅ Veículo excluído!");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    await carregarTodosDados();
    renderizarPainelAdm();
    renderizarListaVeiculos();
    
    if (veiculoDetalheAberto === placa) {
      fecharCartao();
    }
  } else {
    alert("❌ " + (res.erro || "Erro ao excluir!"));
  }
}

async function alternarCercaVirtual() {
  if (!veiculoDetalheAberto) {
    alert("Selecione um veículo primeiro!");
    return;
  }
  
  const listaDados = ehAdm ? todosVeiculos : veiculosDoUsuario;
  const v = listaDados.find(x => x.placa === veiculoDetalheAberto);
  if (!v || !v.lat || !v.lon) {
    alert("O veículo precisa de ter uma posição válida no mapa para ativar a cerca!");
    return;
  }
  
  const placa = v.placa;
  const btnCerca = document.getElementById('btn-cerca-cartao');
  
  const ativarNovoEstado = !cercasVirtuais[placa] || !cercasVirtuais[placa].ativo;
  const latLonStr = `${v.lat},${v.lon}`;
  const raioMetros = 200;

  btnCerca.disabled = true;
  btnCerca.textContent = "⏳ A gravar...";

  try {
    const resposta = await fetch(URL_SCRIPT, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({
        acao: 'salvarCercaVirtual',
        placa: placa,
        ativa: ativarNovoEstado,
        latLon: ativarNovoEstado ? latLonStr : '',
        raio: raioMetros
      })
    });
    
    const res = await resposta.json();
    if (!res.ok) {
      alert("❌ Erro ao salvar cerca no servidor!");
      btnCerca.disabled = false;
      return;
    }

    if (ehAdm) await carregarTodosDados();
    else await carregarDadosUsuario();

    const listaAtualizada = ehAdm ? todosVeiculos : veiculosDoUsuario;
    sincronizarCercasNoMapa(listaAtualizada);

    if (ativarNovoEstado) {
      alert(`✅ Cerca virtual ativada e persistida para o veículo ${v.nome || placa}!`);
    } else {
      alert("🛡️ Cerca virtual desativada.");
    }

  } catch (erro) {
    console.error(erro);
    alert("❌ Erro de comunicação com o servidor.");
  } finally {
    btnCerca.disabled = false;
  }
}

function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function verificarCercaVirtual(v) {
  const placa = v.placa;
  if (!cercasVirtuais[placa] || !cercasVirtuais[placa].ativo) return;
  
  const cerca = cercasVirtuais[placa];
  const distancia = calcularDistanciaMetros(cerca.latCentro, cerca.lonCentro, v.lat, v.lon);
  
  const avisoContainer = document.getElementById('aviso-cerca-container');
  const textoAviso = document.getElementById('texto-aviso-cerca');
  
  if (distancia > cerca.raio) {
    if (!cerca.violado) {
      cerca.violado = true;
      cerca.horarioViolacao = v.horario || new Date().toLocaleTimeString();
      
      if (cerca.objetoCirculo) {
        cerca.objetoCirculo.setStyle({ color: '#dc3545', fillColor: '#dc3545' });
      }
    }
    
    if (veiculoDetalheAberto === placa && avisoContainer) {
      textoAviso.textContent = `Cerca violada às ${cerca.horarioViolacao} (Distância: ${Math.round(distancia)}m)`;
      avisoContainer.style.display = 'block';
    }
  }
}

function limparAlertaCerca() {
  if (!veiculoDetalheAberto) return;
  const placa = veiculoDetalheAberto;
  if (cercasVirtuais[placa]) {
    cercasVirtuais[placa].violado = false;
    if (cercasVirtuais[placa].objetoCirculo) {
      cercasVirtuais[placa].objetoCirculo.setStyle({ color: '#007bff', fillColor: '#007bff' });
    }
  }
  document.getElementById('aviso-cerca-container').style.display = 'none';
}

async function buscarEdesenharHistorico() {
  if (!veiculoDetalheAberto) {
    alert("Selecione um veículo primeiro!");
    return;
  }
  
  const dataInput = document.getElementById('data-historico').value;
  if (!dataInput) {
    alert("Por favor, selecione uma data para consultar a rota!");
    return;
  }
  
  const placa = veiculoDetalheAberto;
  limparHistoricoMapa();

  try {
    const urlBusca = `${URL_SCRIPT}?acao=buscarHistorico&placa=${encodeURIComponent(placa)}&data=${encodeURIComponent(dataInput)}`;
    const resposta = await fetch(urlBusca);
    const res = await resposta.json();

    if (!res.ok || !res.pontos || res.pontos.length === 0) {
      alert("⚠️ Nenhum registo de rota encontrado para esta data.");
      return;
    }

    dadosHistoricoCarregados = res.pontos;
    const coordenadas = [];
    let pontosParada = [];

    for (let i = 0; i < res.pontos.length; i++) {
      const p = res.pontos[i];
      coordenadas.push([p.lat, p.lon]);

      if (p.velocidade <= 1) {
        pontosParada.push(p);
      }
    }

    camadaRotaHistorico = L.polyline(coordenadas, {
      color: '#007bff',
      weight: 5,
      opacity: 0.85
    }).addTo(mapa);

    mapa.fitBounds(camadaRotaHistorico.getBounds(), { padding: [50, 50] });

    analisarEmarcarParadas(pontosParada);

    alert(`✅ Rota carregada com sucesso! (${res.pontos.length} pontos encontrados).`);

  } catch (erro) {
    console.error(erro);
    alert("❌ Erro ao buscar histórico no servidor.");
  }
}

function analisarEmarcarParadas(pontosParada) {
  if (pontosParada.length === 0) return;

  const iconeParada = L.divIcon({
    className: 'marcador-parada',
    html: '<div style="background: #ffc107; color: #000; border: 2px solid #333; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">🅿️</div>',
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });

  let gruposParadas = [];
  let atualGrupo = [pontosParada[0]];

  for (let i = 1; i < pontosParada.length; i++) {
    const pAnt = pontosParada[i - 1];
    const pAtual = pontosParada[i];
    const distancia = calcularDistanciaMetros(pAnt.lat, pAnt.lon, pAtual.lat, pAtual.lon);

    if (distancia < 15) {
      atualGrupo.push(pAtual);
    } else {
      if (atualGrupo.length >= 3) {
        gruposParadas.push(atualGrupo);
      }
      atualGrupo = [pAtual];
    }
  }
  if (atualGrupo.length >= 3) {
    gruposParadas.push(atualGrupo);
  }

  gruposParadas.forEach(grupo => {
    const inicio = grupo[0].horario;
    const fim = grupo[grupo.length - 1].horario;
    const lat = grupo[0].lat;
    const lon = grupo[0].lon;

    const marcadorP = L.marker([lat, lon], { icon: iconeParada }).addTo(mapa);
    marcadorP.bindPopup(`<b>🅿️ Veículo Estacionado</b><br>Início: ${inicio}<br>Fim: ${fim}`);
    marcadoresParadasHistorico.push(marcadorP);
  });
}

function limparHistoricoMapa() {
  if (camadaRotaHistorico && mapa) {
    mapa.removeLayer(camadaRotaHistorico);
    camadaRotaHistorico = null;
  }
  
  marcadoresParadasHistorico.forEach(m => {
    if (mapa) mapa.removeLayer(m);
  });
  marcadoresParadasHistorico = [];
  dadosHistoricoCarregados = [];
}

function exportarRelatorioCSV() {
  if (!dadosHistoricoCarregados || dadosHistoricoCarregados.length === 0) {
    alert("⚠️ Nenhum dado de histórico carregado para exportar. Clique primeiro em '🔍 Ver Rota'.");
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,Placa;Data;Horario;Latitude;Longitude;Velocidade(km/h);IMEI\n";

  dadosHistoricoCarregados.forEach(p => {
    csvContent += `${p.placa};${p.data};${p.horario};${p.lat};${p.lon};${p.velocidade};${p.imei}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `relatorio_rota_${veiculoDetalheAberto}_${document.getElementById('data-historico').value}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

window.onload = function() {
  mostrarVersaoLogin();
};
