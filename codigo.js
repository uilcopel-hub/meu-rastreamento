// === CRIAR O MAPA — Ibaiti/PR 📍 ===
const mapa = L.map('mapa').setView([-23.8478, -50.1961], 13);

// === CAMADAS DO MAPA ===
const mapaRuas = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '© Google Maps — Meu Rastreamento'
});

const mapaSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '© Google Maps — Meu Rastreamento'
});

// Inicia com mapa de ruas
mapaRuas.addTo(mapa);
let modoAtual = 'ruas';

// === TROCAR MAPA ===
function trocarMapa(tipo) {
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

// === MARCADORES DOS VEÍCULOS ===
const marcadores = {};
const cores = { 1: '#28a745', 2: '#007bff', 3: '#fd7e14' };

for (let num = 1; num <= 3; num++) {
    marcadores[num] = L.circleMarker([-23.8478, -50.1961], {
        color: cores[num],
        fillColor: cores[num],
        fillOpacity: 0.9,
        radius: 13
    }).addTo(mapa).bindPopup(`<b>Carro ${num}</b><br>Aguardando dados...`);
}

// === ATUALIZAR POSIÇÃO ===
function atualizarPosicao(carro, lat, lon, vel = 0, placa = '') {
    marcadores[carro].setLatLng([lat, lon]);
    marcadores[carro].setPopupContent(`
        <b>Carro ${carro}</b><br>
        Placa: ${placa}<br>
        Latitude: ${lat.toFixed(6)}<br>
        Longitude: ${lon.toFixed(6)}<br>
        Velocidade: ${vel} km/h
    `);

    const statusEl = document.getElementById(`status${carro}`);
    if (statusEl) {
        statusEl.innerHTML = vel > 0 ? `✅ Em movimento — ${vel} km/h` : '⏹ Parado';
    }
    document.getElementById('ultima-atualizacao').textContent = new Date().toLocaleString('pt-BR');
}

// === FOCO NO CARRO ===
function focarNoCarro(num) {
    const pos = marcadores[num].getLatLng();
    mapa.setView(pos, 16);
    marcadores[num].openPopup();
}

// === SIMULAÇÃO DE MOVIMENTO ===
let posicoes = {
    1: { lat: -23.8478, lon: -50.1961, vel: 40, placa: 'ABC-1234' },
    2: { lat: -23.8500, lon: -50.1980, vel: 55, placa: 'DEF-5678' },
    3: { lat: -23.8450, lon: -50.1930, vel: 0, placa: 'GHI-9012' }
};

setInterval(() => {
    posicoes[1].lon += 0.00012;
    posicoes[2].lat += 0.00015;
    posicoes[2].lon += 0.00008;
    
    for (let num = 1; num <= 3; num++) {
        atualizarPosicao(num, posicoes[num].lat, posicoes[num].lon, posicoes[num].vel, posicoes[num].placa);
    }
}, 2000);