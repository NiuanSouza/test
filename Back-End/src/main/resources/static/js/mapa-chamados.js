/**
 * ===================================================================
 * ARQUIVO: mapa-chamados.js
 * REFERÊNCIA GLOBAL: Requer 'basic.js' e a biblioteca Leaflet (L) injetada
 * RESPONSABILIDADE: Inicializar o mapa interativo de monitoramento, consumir
 * as coordenadas geográficas dos chamados via API e renderizar marcadores
 * coloridos e informativos baseados no status operacional atual.
 * ===================================================================
 */

// ===================================================================
// 1. INICIALIZAÇÃO DO MAPA (Leaflet Engine)
// ===================================================================

/**
 * Função: inicializarMapaChamados (Global)
 * O que faz: Verifica a existência do container HTML e da biblioteca Leaflet.
 * Configura as coordenadas centrais padrão, o nível de zoom, renderiza
 * a camada de renderização de mapas do OpenStreetMap e dispara a busca de dados.
 */
window.inicializarMapaChamados = function() {
    const mapaElement = document.getElementById("mapaChamados");

    // Proteção de segurança caso o script seja carregado em uma tela sem o mapa ou sem a biblioteca
    if (!mapaElement || typeof L === "undefined") {
        console.error("⚠️ [SIVA MAPS] Container de mapa não disponível ou biblioteca Leaflet (L) não foi carregada.");
        return;
    }

    // Cria o objeto de mapa Leaflet definindo coordenadas de foco inicial e comportamento de scroll
    const map = L.map(mapaElement, {
        center: [-23.5567, -46.6457],
        zoom: 13,
        scrollWheelZoom: true
    });
    
    // Salva a instância do mapa globalmente para permitir navegação externa (ex: botão Ver no Mapa)
    window.mapaMonitoramento = map;

    // Injeta os tiles (imagens de renderização de ruas) do OpenStreetMap com seus respectivos créditos
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    // Encaminha o objeto do mapa para o fluxo de carregamento de dados da API
    carregarChamadosDaAPITecnico(map);
};

// ===================================================================
// 2. INTEGRAÇÃO COM A API E FALLBACKS
// ===================================================================

/**
 * Função: carregarChamadosDaAPITecnico
 * O que faz: Realiza a chamada assíncrona na rota de chamados utilizando o
 * wrapper seguro do SIVA. Se a API falhar ou estiver indisponível, aciona
 * automaticamente o fallback de dados locais.
 * Requisição: GET /chamado/todos
 */
async function carregarChamadosDaAPITecnico(map) {
    try {
        // Consome a rota usando o barramento padrão do basic.js (com injeção automática de token JWT)
        const response = await window.apiFetch("/service/pending", { method: "GET" });

        if (response && response.ok) {
            const data = await response.json();
            renderizarMarkersTecnico(map, data);
        } else {
            console.warn("Rota da API indisponível ou retornou erro. Acionando base local de contingência.");
            carregarChamadosLocalTecnico(map);
        }
    } catch (error) {
        console.error("Erro na comunicação com a API de mapas:", error);
        carregarChamadosLocalTecnico(map);
    }
}

/**
 * Função: carregarChamadosLocalTecnico
 * O que faz: Atua como barreira de contingência. Tenta ler os chamados salvos
 * no LocalStorage pelo gestor; caso não existam, carrega uma lista estática mockada
 * para fins de demonstração visual e testes de interface.
 */
function carregarChamadosLocalTecnico(map) {
    const stored = localStorage.getItem("chamadosGestor");

    if (stored) {
        const chamados = JSON.parse(stored);
        renderizarMarkersTecnico(map, chamados);
    } else {
        // Lista de amostragem padrão (Exemplo mockado) utilizado caso o banco esteja vazio
        const chamadosExample = [
            { endereco: "Rua das Flores, 123", tipoServico: "Manutenção Corretiva", latitude: -23.5567, longitude: -46.6457, status: "novo", observacoes: "Verificar painel elétrico e quadro de distribuição." },
            { endereco: "Av. Paulista, 1522", tipoServico: "Troca de Válvula", latitude: -23.5645, longitude: -46.6534, status: "ativo", observacoes: "Substituir válvula danificada no sistema de água fria." },
            { endereco: "Rua da Paz, 890", tipoServico: "Inspeção Preventiva", latitude: -23.5483, longitude: -46.6348, status: "pendente", observacoes: "Checar orientação e registrar fotos do equipamento." }
        ];
        renderizarMarkersTecnico(map, chamadosExample);
    }
}

// ===================================================================
// 3. RENDERIZAÇÃO DE MARCADORES E COMPONENTES VISUAIS (UI)
// ===================================================================

/**
 * Função: renderizarMarkersTecnico
 * O que faz: Varre o array de chamados fornecido, cria marcadores circulares (circleMarker),
 * aplica cores dinâmicas baseadas no status, vincula um balão flutuante (Popup HTML)
 * com os detalhes do atendimento e ajusta automaticamente o enquadramento do mapa (fitBounds).
 */
function renderizarMarkersTecnico(map, chamados) {
    const markers = chamados.map(chamado => {
        // Determina a cor do ponto luminoso baseando-se no status cadastrado
        const cor = obterCorPorStatusTecnico(chamado.status || "novo");

        // Mapeia latitude/longitude suportando múltiplos formatos de nomenclatura de chaves vindas do DTO
        const lat = chamado.latitude || chamado.lat;
        const lng = chamado.longitude || chamado.lng;

        if (!lat || !lng) return null; // Ignora o registro caso não contenha coordenadas válidas

        // Cria o marcador estilizado no mapa
        const marker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: cor,
            color: "#fff", // Borda branca para dar contraste sobre as ruas do mapa
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);

        // Estrutura o HTML que será renderizado de forma flutuante ao clicar no marcador
        const popupConteudo = `
            <div class="popup-mapa" style="font-family: sans-serif; font-size: 13px;">
                <strong style="display:block; margin-bottom:2px; color:#1a3c6d;">${chamado.endereco || chamado.title || "Endereço não informado"}</strong>
                <small style="color:#555; font-weight:600;">${chamado.tipoServico || chamado.title || "Serviço"}</small><br>
                <span style="display:inline-block; margin-top:5px;"><strong>Status:</strong> ${chamado.status || "novo"}</span><br>
                <p style="margin:6px 0 0 0; font-size:11px; color:#666; border-top:1px solid #eee; padding-top:4px;">
                    ${chamado.observacoes || chamado.observacao || "Sem observações registradas."}
                </p>
            </div>
        `;

        marker.bindPopup(popupConteudo, { maxWidth: 260 });
        return marker;
    }).filter(m => m !== null); // Expulsa marcadores nulos do array gerado

    // Se houver marcadores renderizados, ajusta automaticamente a câmera do mapa para englobar todos os pontos
    if (markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.2)); // Aplica uma margem de conforto (padding) nas bordas
    }
}

/**
 * Função: obterCorPorStatusTecnico
 * O que faz: Dicionário lógico que retorna códigos de cores hexadecimais
 * correspondentes a cada estado operacional do chamado.
 */
function obterCorPorStatusTecnico(status) {
    switch (String(status).toLowerCase().trim()) {
        case "novo":
            return "#FFD700"; // Amarelo Gold
        case "pendente":
            return "#FF9800"; // Laranja operacional
        case "ativo":
        case "em andamento":
            return "#4CAF50"; // Verde em execução
        case "concluido":
        case "finalizado":
            return "#2196F3"; // Azul de finalização
        default:
            return "#9E9E9E"; // Cinza para indefinido
    }
}

// ===================================================================
// 4. GATILHOS DE INICIALIZAÇÃO AUTOMÁTICA
// ===================================================================

document.addEventListener("DOMContentLoaded", () => {
    // Escuta o carregamento da página e ativa o mapa se a URL corresponder à tela operacional ou de gestão de chamados
    const pathname = window.location.pathname;
    const isTelaMapa = pathname.includes("chamados.html") || pathname.includes("tela-mapa-gestor.html");

    if (isTelaMapa) {
        window.inicializarMapaChamados();
    }
});

/**
 * Função: focarNoMapa (Global)
 * O que faz: Recebe coordenadas e move a câmera do mapa com zoom aproximado
 * focado no marcador do chamado específico.
 */
window.focarNoMapa = function(lat, lng) {
    if (window.mapaMonitoramento) {
        // Usa setView para centralizar na coordenada com zoom 17 e animação suave
        window.mapaMonitoramento.setView([lat, lng], 17, { animate: true, duration: 0.8 });
        
        // Faz um pequeno scroll suave para garantir que o mapa esteja visível na tela
        const mapaContainer = document.getElementById("mapaChamados");
        if (mapaContainer) {
            mapaContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    } else {
        console.warn("O mapa ainda não foi inicializado.");
    }
};