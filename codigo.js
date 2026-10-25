// === DADOS DE ACESSO ===
const USUARIO_PERMITIDO = 'admin';
const SENHA_PERMITIDA = '123456';

// === CORES DOS VEÍCULOS ===
const CORES_PADRAO = ['#28a745', '#007bff', '#fd7e14', '#9c27b0', '#e91e63', '#00bcd4'];

// === DADOS ARMAZENADOS ===
let veiculos = [];
let marcadores = {};
let rastros = {};       // Guarda a linha do percurso de cada carro
let historico = {};     // Guarda os pontos por onde o carro passou
let veiculoSelecionado = null; // Qual carro está ativo
let mapa = null;
let modoAtual = 'ruas';
let mapaRuas, mapaSatellite;

// === INICIALIZAÇÃO ===
document.addEventListener('DOMContentLoaded', () => {
    carregarVeiculosSalvos();
});

// === LOGIN ===
function fazerLogin() {
    const usuario = document.getElementById('usuario').value.trim();
    const senha = document.getElementById('senha').value;
    const erro = document.getElementById('erro-login');

    if (usuario === USUARIO_PERMITIDO && senha === SENHA_PERMITIDA) {
        document.getElementById('tela-login').classList.remove('tela-ativa');
        document.getElementById('tela-login').classList.add('tela-escondida');
        document.getElementById('tela-principal').classList.remove('tela-escondida');
        document.getElementById('tela-principal').classList.add('tela-ativa');
        inicializarMapa();
        renderizarListaVeiculos();
    } else {
        erro.textContent = 'Usuário ou senha incorretos!';
    }
}

// === SAIR ===
function sair() {
    location.reload();
}

// === MAPA ===
function inicializarMapa() {
    mapa = L.map('mapa').setView([-23.8478, -50.1961], 13);

    mapaRuas = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps — Rastreamento de Veículos'
    });

    mapaSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps — Rastreamento de Veículos'
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

// === GERENCIADOR DE VEÍCULOS ===
function abrirGerenciador() {
    document.getElementById('modal-gerenciar').classList.add('modal-ativo');
    document.getElementById('modal-gerenciar').classList.remove('modal-escondido');
    atualizarListaCadastro();
}

function fecharGerenciador() {
    document.getElementById('modal-gerenciar').classList.remove('modal-ativo');
    document.getElementById('modal-gerenciar').classList.add('modal-escondido');
}

function salvarVeiculo() {
    const nome = document.getElementById('campo-nome').value.trim();
    const placa = document.getElementById('campo-placa').value.trim();
    const cor = document.getElementById('campo-cor').value.trim();

    if (!nome || !placa) {
        alert('Preencha Nome e Placa!');
        return;
    }

    const indiceExistente = veiculos.findIndex(v => v.placa === placa);
    
    const veiculo = {
        id: placa,
        nome,
        placa,
        cor,
        corMarcador: CORES_PADRAO[veiculos.length % CORES_PADRAO.length],
        lat: null,
        lon: null,
        velocidade: 0,
        ultimoSinal: null
    };

    if (indiceExistente >= 0) {
        veiculos[indiceExistente] = { ...veiculos[indiceExistente], nome, cor };
    } else {
        veiculos.push(veiculo);
        historico[placa] = [];  // Inicia histórico vazio
    }

    salvarNoNavegador();
    renderizarListaVeiculos();
    atualizarListaCadastro();
    
    document.getElementById('campo-nome').value = '';
    document.getElementById('campo-placa').value = '';
    document.getElementById('campo-cor').value = '';
}

function excluirVeiculo(placa) {
    if (!confirm('Tem certeza que deseja excluir este veículo?')) return;
    
    veiculos = veiculos.filter(v => v.placa !== placa);
    
    if (marcadores[placa]) mapa.removeLayer(marcadores[placa]);
    if (rastros[placa]) mapa.removeLayer(rastros[placa]);
    delete marcadores[placa];
    delete rastros[placa];
    delete historico[placa];
    
    if (veiculoSelecionado === placa) veiculoSelecionado = null;

    salvarNoNavegador();
    renderizarListaVeiculos();
    atualizarListaCadastro();
}

// === SELECIONAR VEÍCULO E INICIAR RASTRO ===
function focarNoVeiculo(placa) {
    const v = veiculos.find(x => x.placa === placa);
    if (!v) return;

    // Se clicar no mesmo, desmarca
    if (veiculoSelecionado === placa) {
        veiculoSelecionado = null;
        renderizarListaVeiculos();
        return;
    }

    // Se clicar em outro, marca como selecionado
    veiculoSelecionado = placa;
    renderizarListaVeiculos();

    if (v.lat && v.lon) {
        mapa.setView([v.lat, v.lon], 16);
        if (marcadores[placa]) marcadores[placa].openPopup();
    }
}

// === ADICIONAR PONTO NO RASTRO ===
function adicionarPontoRastro(placa, lat, lon) {
    if (!historico[placa]) historico[placa] = [];

    // Evita pontos repetidos ou muito próximos
    const ultimo = historico[placa][historico[placa].length - 1];
    if (ultimo && Math.abs(ultimo[0] - lat) < 0.0001 && Math.abs(ultimo[1] - lon) < 0.0001) return;

    // Adiciona novo ponto
    historico[placa].push([lat, lon]);

    // Limita o histórico a 200 pontos para não travar
    if (historico[placa].length > 200) {
        historico[placa].shift();
    }

    // Desenha/atualiza a linha no mapa
    const v = veiculos.find(x => x.placa === placa);
    if (!v) return;

    if (rastros[placa]) {
        mapa.removeLayer(rastros[placa]);
    }

    rastros[placa] = L.polyline(historico[placa], {
        color: v.corMarcador,
        weight: 4,
        opacity: 0.7,
        smoothFactor: 1
    }).addTo(mapa);
}

// === ATUALIZAR LISTA E DESENHAR MARCADORES ===
function renderizarListaVeiculos() {
    const container = document.getElementById('lista-veiculos');
    container.innerHTML = '';

    veiculos.forEach(v => {
        const semSinal = !v.lat || !v.lon;
        const selecionado = veiculoSelecionado === v.placa;
        const status = semSinal 
            ? '🔄 Aguardando sinal...' 
            : (v.velocidade > 0 ? `✅ Em movimento — ${v.velocidade} km/h` : '⏹ Parado');

        const div = document.createElement('div');
        div.className = `veiculo ${semSinal ? 'veiculo-sem-sinal' : ''} ${selecionado ? 'veiculo-selecionado' : ''}`;
        div.style.borderLeft = `4px solid ${v.corMarcador}`;
        div.onclick = () => focarNoVeiculo(v.placa);
        div.innerHTML = `
            <strong>${selecionado ? '📍 ' : ''}${v.nome}</strong><br>
            Placa: ${v.placa}<br>
            ${v.cor ? `Cor/Modelo: ${v.cor}<br>` : ''}
            <span id="status-${v.placa.replace(/[^A-Z0-9]/g, '')}">${status}</span>
        `;
        container.appendChild(div);

        // Atualiza marcador
        if (!semSinal) {
            if (!marcadores[v.placa]) {
                marcadores[v.placa] = L.circleMarker([v.lat, v.lon], {
                    color: v.corMarcador,
                    fillColor: v.corMarcador,
                    fillOpacity: selecionado ? 1 : 0.8,
                    radius: selecionado ? 15 : 13
                }).addTo(mapa);
            } else {
                marcadores[v.placa].setLatLng([v.lat, v.lon]);
                marcadores[v.placa].setStyle({
                    fillOpacity: selecionado ? 1 : 0.8,
                    radius: selecionado ? 15 : 13
                });
            }
            marcadores[v.placa].setPopupContent(`
                <b>${v.nome}</b>${selecionado ? ' — Rastro ativo' : ''}<br>
                Placa: ${v.placa}<br>
                Lat: ${v.lat.toFixed(6)}<br>
                Lon: ${v.lon.toFixed(6)}<br>
                Velocidade: ${v.velocidade} km/h<br>
                Pontos no rastro: ${historico[v.placa] ? historico[v.placa].length : 0}<br>
                Último sinal: ${v.ultimoSinal ? new Date(v.ultimoSinal).toLocaleString('pt-BR') : '--'}
            `);

            // Adiciona ponto ao rastro SOMENTE se for o veículo selecionado
            if (selecionado) {
                adicionarPontoRastro(v.placa, v.lat, v.lon);
            }
        }
    });

    document.getElementById('ultima-atualizacao').textContent = new Date().toLocaleString('pt-BR');
}

function atualizarListaCadastro() {
    const container = document.getElementById('lista-cadastro');
    container.innerHTML = '';

    veiculos.forEach(v => {
        const div = document.createElement('div');
        div.className = 'item-cadastro';
        div.innerHTML = `
            <div>
                <strong>${v.nome}</strong><br>
                ${v.placa} ${v.cor ? `— ${v.cor}` : ''}
            </div>
            <button class="btn-excluir" onclick="excluirVeiculo('${v.placa}')">Excluir</button>
        `;
        container.appendChild(div);
    });

    if (veiculos.length === 0) {
        container.innerHTML = '<p style="color:#888">Nenhum veículo cadastrado ainda.</p>';
    }
}

// === SALVAR/CARREGAR NO NAVEGADOR ===
function salvarNoNavegador() {
    localStorage.setItem('rastreamento_veiculos', JSON.stringify(veiculos));
}

function carregarVeiculosSalvos() {
    const dados = localStorage.getItem('rastreamento_veiculos');
    if (dados) {
        veiculos = JSON.parse(dados);
        // Inicializa históricos
        veiculos.forEach(v => {
            if (!historico[v.placa]) historico[v.placa] = [];
        });
    } else {
        veiculos = [
            { id: 'ABC-1234', nome: 'Veículo 1', placa: 'ABC-1234', cor: '', corMarcador: '#28a745', lat: null, lon: null, velocidade: 0, ultimoSinal: null },
            { id: 'DEF-5678', nome: 'Veículo 2', placa: 'DEF-5678', cor: '', corMarcador: '#007bff', lat: null, lon: null, velocidade: 0, ultimoSinal: null },
            { id: 'GHI-9012', nome: 'Veículo 3', placa: 'GHI-9012', cor: '', corMarcador: '#fd7e14', lat: null, lon: null, velocidade: 0, ultimoSinal: null }
        ];
        veiculos.forEach(v => historico[v.placa] = []);
    }
}

// ==================================================
// 🧪 SIMULAÇÃO DE MOVIMENTO (para testar o rastro)
// ==================================================
let simulacaoAtiva = false;

function iniciarSimulacao() {
    if (simulacaoAtiva) return;
    simulacaoAtiva = true;

    // Posições iniciais para teste
    veiculos.forEach(v => {
        if (!v.lat) {
            v.lat = -23.8478 + (Math.random() - 0.5) * 0.02;
            v.lon = -50.1961 + (Math.random() - 0.5) * 0.02;
        }
    });

    setInterval(() => {
        veiculos.forEach(v => {
            // Movimento contínuo
            v.lon += 0.0001 + Math.random() * 0.0001;
            v.lat += 0.00005 + Math.random() * 0.00005;
            v.velocidade = Math.floor(35 + Math.random() * 30);
            v.ultimoSinal = new Date().toISOString();
        });
        renderizarListaVeiculos();
    }, 2000);
}

// Inicia automaticamente após login
const verificarLogin = setInterval(() => {
    if (mapa) {
        clearInterval(verificarLogin);
        iniciarSimulacao();
    }
}, 300);