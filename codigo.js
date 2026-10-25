// === CORES ===
const CORES_PADRAO = ['#28a745', '#007bff', '#fd7e14', '#9c27b0', '#e91e63', '#00bcd4'];

// === DADOS GLOBAIS ===
let usuarioAtual = null;
let veiculos = [];
let marcadores = {};
let rastros = {};
let historico = {};
let veiculoSelecionado = null;
let mapa = null;
let modoAtual = 'ruas';
let mapaRuas, mapaSatellite;

// === INICIO ===
document.addEventListener('DOMContentLoaded', () => {
    // Verifica se já está logado
    const sessao = localStorage.getItem('usuario_logado');
    if (sessao) {
        entrarComoUsuario(sessao);
    }
});

// === TROCAR FORMULÁRIO ===
function mostrarCadastro(e) {
    e.preventDefault();
    document.getElementById('form-entrar').classList.add('escondido');
    document.getElementById('form-cadastro').classList.remove('escondido');
    limparErros();
}

function mostrarLogin(e) {
    e.preventDefault();
    document.getElementById('form-cadastro').classList.add('escondido');
    document.getElementById('form-entrar').classList.remove('escondido');
    limparErros();
}

function limparErros() {
    document.getElementById('erro-login').textContent = '';
    document.getElementById('erro-cadastro').textContent = '';
}

// === CRIAR CONTA ===
function criarConta() {
    const usuario = document.getElementById('novo-usuario').value.trim();
    const senha = document.getElementById('nova-senha').value;
    const confirma = document.getElementById('confirma-senha').value;
    const erro = document.getElementById('erro-cadastro');

    if (!usuario || usuario.length < 3) {
        erro.textContent = 'Usuário precisa ter pelo menos 3 caracteres!';
        return;
    }
    if (!senha || senha.length < 4) {
        erro.textContent = 'Senha precisa ter pelo menos 4 caracteres!';
        return;
    }
    if (senha !== confirma) {
        erro.textContent = 'As senhas não coincidem!';
        return;
    }

    const contas = JSON.parse(localStorage.getItem('contas') || '{}');
    if (contas[usuario]) {
        erro.textContent = 'Esse usuário já existe! Escolha outro.';
        return;
    }

    // Cria conta nova
    contas[usuario] = { senha: senha };
    localStorage.setItem('contas', JSON.stringify(contas));
    
    // Entra direto
    entrarComoUsuario(usuario);
}

// === FAZER LOGIN ===
function fazerLogin() {
    const usuario = document.getElementById('usuario').value.trim();
    const senha = document.getElementById('senha').value;
    const erro = document.getElementById('erro-login');

    const contas = JSON.parse(localStorage.getItem('contas') || '{}');
    
    if (!contas[usuario]) {
        erro.textContent = 'Usuário não encontrado!';
        return;
    }
    if (contas[usuario].senha !== senha) {
        erro.textContent = 'Senha incorreta!';
        return;
    }

    entrarComoUsuario(usuario);
}

// === ENTRAR E CARREGAR DADOS DO USUÁRIO ===
function entrarComoUsuario(usuario) {
    usuarioAtual = usuario;
    localStorage.setItem('usuario_logado', usuario);

    // Troca de tela
    document.getElementById('tela-login').classList.remove('tela-ativa');
    document.getElementById('tela-login').classList.add('tela-escondida');
    document.getElementById('tela-principal').classList.remove('tela-escondida');
    document.getElementById('tela-principal').classList.add('tela-ativa');

    // Mostra nome do usuário
    document.getElementById('nome-usuario-logado').textContent = `👤 ${usuario}`;

    // Carrega veículos DESTE usuário (sem exemplos!)
    carregarVeiculosDoUsuario();
    
    // Inicia mapa
    if (!mapa) inicializarMapa();
    
    renderizarListaVeiculos();
}

// === SAIR ===
function sair() {
    localStorage.removeItem('usuario_logado');
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

// === GERENCIAR VEÍCULOS ===
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
    const placa = document.getElementById('campo-placa').value.trim().toUpperCase();
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
        historico[placa] = [];
    }

    salvarVeiculosDoUsuario();
    renderizarListaVeiculos();
    atualizarListaCadastro();
    
    document.getElementById('campo-nome').value = '';
    document.getElementById('campo-placa').value = '';
    document.getElementById('campo-cor').value = '';
}

function excluirVeiculo(placa) {
    if (!confirm('Tem certeza?')) return;
    
    veiculos = veiculos.filter(v => v.placa !== placa);
    
    if (marcadores[placa]) mapa.removeLayer(marcadores[placa]);
    if (rastros[placa]) mapa.removeLayer(rastros[placa]);
    delete marcadores[placa];
    delete rastros[placa];
    delete historico[placa];
    
    if (veiculoSelecionado === placa) veiculoSelecionado = null;

    salvarVeiculosDoUsuario();
    renderizarListaVeiculos();
    atualizarListaCadastro();
}

// === SELECIONAR E RASTRO ===
function focarNoVeiculo(placa) {
    const v = veiculos.find(x => x.placa === placa);
    if (!v) return;

    if (veiculoSelecionado === placa) {
        veiculoSelecionado = null;
        renderizarListaVeiculos();
        return;
    }

    veiculoSelecionado = placa;
    renderizarListaVeiculos();

    if (v.lat && v.lon) {
        mapa.setView([v.lat, v.lon], 16);
        if (marcadores[placa]) marcadores[placa].openPopup();
    }
}

function adicionarPontoRastro(placa, lat, lon) {
    if (!historico[placa]) historico[placa] = [];

    const ultimo = historico[placa][historico[placa].length - 1];
    if (ultimo && Math.abs(ultimo[0] - lat) < 0.0001 && Math.abs(ultimo[1] - lon) < 0.0001) return;

    historico[placa].push([lat, lon]);
    if (historico[placa].length > 200) historico[placa].shift();

    const v = veiculos.find(x => x.placa === placa);
    if (!v) return;

    if (rastros[placa]) mapa.removeLayer(rastros[placa]);

    rastros[placa] = L.polyline(historico[placa], {
        color: v.corMarcador,
        weight: 4,
        opacity: 0.7,
        smoothFactor: 1
    }).addTo(mapa);
}

// === RENDERIZAR ===
function renderizarListaVeiculos() {
    const container = document.getElementById('lista-veiculos');
    container.innerHTML = '';

    if (veiculos.length === 0) {
        container.innerHTML = `<p class="sem-veiculo">Nenhum veículo cadastrado ainda.<br>Clique em "➕ Gerenciar Veículos" para adicionar.</p>`;
        document.getElementById('ultima-atualizacao').textContent = new Date().toLocaleString('pt-BR');
        return;
    }

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
            <span>${status}</span>
        `;
        container.appendChild(div);

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
                Pontos: ${historico[v.placa] ? historico[v.placa].length : 0}<br>
                Último sinal: ${v.ultimoSinal ? new Date(v.ultimoSinal).toLocaleString('pt-BR') : '--'}
            `);

            if (selecionado) adicionarPontoRastro(v.placa, v.lat, v.lon);
        }
    });

    document.getElementById('ultima-atualizacao').textContent = new Date().toLocaleString('pt-BR');
}

function atualizarListaCadastro() {
    const container = document.getElementById('lista-cadastro');
    container.innerHTML = '';

    if (veiculos.length === 0) {
        container.innerHTML = '<p style="color:#888">Nenhum veículo cadastrado.</p>';
        return;
    }

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
}

// === SALVAR/CARREGAR POR USUÁRIO ===
function salvarVeiculosDoUsuario() {
    localStorage.setItem(`veiculos_${usuarioAtual}`, JSON.stringify(veiculos));
}

function carregarVeiculosDoUsuario() {
    const dados = localStorage.getItem(`veiculos_${usuarioAtual}`);
    veiculos = dados ? JSON.parse(dados) : [];
    
    // Inicializa históricos
    veiculos.forEach(v => {
        if (!historico[v.placa]) historico[v.placa] = [];
    });
}