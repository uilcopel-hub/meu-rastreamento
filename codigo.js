// ==============================================
const ID_PLANILHA = '1GqozRunE4lnBaCvU7dAb6D9Nu6BiVVk1bKD8v0eoacI';
const URL_BASE = `https://docs.google.com/spreadsheets/d/${ID_PLANILHA}/gviz/tq?tqx=out:json`;
const URL_GRAVAR = `https://script.google.com/macros/s/AKfycbxGFYOwqpt6eYGnJEd-DS31bNK0i2kKk0WpJiDRz1joRwcsb84ZBFXh1kKXvAgNQM2_pw/exec`;
// ==============================================

const CORES_PADRAO = ['#28a745', '#007bff', '#fd7e14', '#9c27b0', '#e91e63', '#00bcd4'];

let usuarioAtual = null;
let veiculos = [];
let marcadores = {};
let rastros = {};
let historico = {};
let veiculoSelecionado = null;
let mapa = null;
let modoAtual = 'ruas';
let mapaRuas, mapaSatellite;

document.addEventListener('DOMContentLoaded', () => {
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
        erro.textContent = 'Usuário precisa ter pelo menos 3 caracteres!'; return;
    }
    if (!senha || senha.length < 4) {
        erro.textContent = 'Senha precisa ter pelo menos 4 caracteres!'; return;
    }
    if (senha !== confirma) {
        erro.textContent = 'As senhas não coincidem!'; return;
    }

    try {
        await fetch(URL_GRAVAR, {
            method: 'POST',
            mode: 'no-cors',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ acao: 'criarConta', usuario, senha })
        });
        
        erro.textContent = '✅ Conta criada! Entrando...';
        setTimeout(() => entrarComoUsuario(usuario), 1500);
    } catch {
        erro.textContent = '⚠️ Erro de conexão. Tente novamente.';
    }
}

async function fazerLogin() {
    const usuario = document.getElementById('usuario').value.trim();
    const senha = document.getElementById('senha').value;
    const erro = document.getElementById('erro-login');

    if (!usuario || !senha) {
        erro.textContent = 'Preencha usuário e senha!'; return;
    }

    try {
        console.log('🔍 Buscando dados...');
        const res = await fetch(URL_BASE);
        if (!res.ok) throw new Error('Erro ao ler planilha');
        
        let texto = await res.text();
        texto = texto.substring(47, texto.length - 2);
        const dados = JSON.parse(texto);
        
        console.log('📋 Dados carregados:', dados.table.rows);
        
        let encontrado = false;
        for (const linha of dados.table.rows) {
            const tipo = linha.c[0]?.v;
            const u = linha.c[1]?.v;
            const s = linha.c[2]?.v;
            
            console.log(`Linha: tipo=${tipo} usuario=${u} senha=${s}`);
            
            if (tipo === 'conta' && u === usuario && s === senha) {
                encontrado = true;
                break;
            }
        }
        
        if (encontrado) {
            entrarComoUsuario(usuario);
        } else {
            erro.textContent = '❌ Usuário ou senha não encontrado!';
        }
    } catch (erroLeitura) {
        console.error(erroLeitura);
        erro.textContent = '⚠️ Erro de leitura — verifique o compartilhamento da planilha!';
    }
}

async function entrarComoUsuario(usuario) {
    usuarioAtual = usuario;
    sessionStorage.setItem('usuario_logado', usuario);

    document.getElementById('tela-login').classList.add('tela-escondida');
    document.getElementById('tela-login').classList.remove('tela-ativa');
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
        maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps — Rastreamento'
    });
    mapaSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps — Rastreamento'
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
        const res = await fetch(URL_BASE);
        let texto = await res.text();
        texto = texto.substring(47, texto.length - 2);
        const dados = JSON.parse(texto);
        
        veiculos = []; historico = {};
        
        for (const linha of dados.table.rows) {
            const tipo = linha.c[0]?.v;
            const dono = linha.c[1]?.v;
            if (tipo === 'veiculo' && dono === usuarioAtual && linha.c[3]?.v) {
                const v = {
                    placa: linha.c[3]?.v,
                    nome: linha.c[4]?.v || linha.c[3]?.v,
                    cor: linha.c[5]?.v || '',
                    corMarcador: CORES_PADRAO[veiculos.length % CORES_PADRAO.length],
                    lat: null, lon: null, velocidade: 0, ultimoSinal: null
                };
                veiculos.push(v);
                historico[v.placa] = [];
            }
        }
        console.log('🚗 Veículos carregados:', veiculos);
    } catch {
        veiculos = [];
    }
}

async function salvarVeiculo() {
    const nome = document.getElementById('campo-nome').value.trim();
    const placa = document.getElementById('campo-placa').value.trim().toUpperCase();
    const cor = document.getElementById('campo-cor').value.trim();

    if (!nome || !placa) { alert('Preencha Nome e Placa!'); return; }

    try {
        await fetch(URL_GRAVAR, {
            method: 'POST',
            mode: 'no-cors',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                acao: 'adicionarVeiculo',
                usuario: usuarioAtual,
                placa, nomeVeiculo: nome, dados: cor
            })
        });
        
        await carregarVeiculosDaNuvem();
        renderizarListaVeiculos();
        atualizarListaCadastro();
        
        document.getElementById('campo-nome').value = '';
        document.getElementById('campo-placa').value = '';
        document.getElementById('campo-cor').value = '';
        alert('✅ Veículo salvo! Atualize a página para ver!');
    } catch {
        alert('⚠️ Erro ao salvar. Tente novamente.');
    }
}

function excluirVeiculo(placa) {
    if (!confirm('Tem certeza?')) return;
    veiculos = veiculos.filter(v => v.placa !== placa);
    if (marcadores[placa]) mapa.removeLayer(marcadores[placa]);
    if (rastros[placa]) mapa.removeLayer(rastros[placa]);
    if (veiculoSelecionado === placa) veiculoSelecionado = null;
    renderizarListaVeiculos();
    atualizarListaCadastro();
}

function abrirGerenciador() {
    document.getElementById('modal-gerenciar').classList.add('modal-ativo');
    document.getElementById('modal-gerenciar').classList.remove('modal-escondido');
    atualizarListaCadastro();
}
function fecharGerenciador() {
    document.getElementById('modal-gerenciar').classList.remove('modal-ativo');
    document.getElementById('modal-gerenciar').classList.add('modal-escondido');
}

function focarNoVeiculo(placa) {
    const v = veiculos.find(x => x.placa === placa);
    if (!v) return;
    veiculoSelecionado = veiculoSelecionado === placa ? null : placa;
    renderizarListaVeiculos();
    if (v.lat && v.lon && veiculoSelecionado) {
        mapa.setView([v.lat, v.lon], 16);
        if (marcadores[placa]) marcadores[placa].openPopup();
    }
}

function renderizarListaVeiculos() {
    const container = document.getElementById('lista-veiculos');
    container.innerHTML = '';
    if (veiculos.length === 0) {
        container.innerHTML = `<p class="sem-veiculo">Nenhum veículo cadastrado.<br>Clique em "➕ Gerenciar Veículos" para adicionar.</p>`;
        document.getElementById('ultima-atualizacao').textContent = new Date().toLocaleString('pt-BR');
        return;
    }
    veiculos.forEach(v => {
        const semSinal = !v.lat || !v.lon;
        const selecionado = veiculoSelecionado === v.placa;
        const status = semSinal ? '🔄 Aguardando sinal...' : (v.velocidade > 0 ? `✅ Em movimento — ${v.velocidade} km/h` : '⏹ Parado');
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
    });
    document.getElementById('ultima-atualizacao').textContent = new Date().toLocaleString('pt-BR');
}
function atualizarListaCadastro() {
    const container = document.getElementById('lista-cadastro');
    container.innerHTML = '';
    if (veiculos.length === 0) {
        container.innerHTML = '<p style="color:#888">Nenhum veículo cadastrado.</p>'; return;
    }
    veiculos.forEach(v => {
        const div = document.createElement('div');
        div.className = 'item-cadastro';
        div.innerHTML = `
            <div><strong>${v.nome}</strong><br>${v.placa} ${v.cor?' — '+v.cor:''}</div>
            <button class="btn-excluir" onclick="excluirVeiculo('${v.placa}')">Excluir</button>
        `;
        container.appendChild(div);
    });
}