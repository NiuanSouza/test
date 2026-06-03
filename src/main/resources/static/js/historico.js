/**
 * ===================================================================
 * ARQUIVO: historico.js
 * REFERÊNCIA GLOBAL: Requer 'basic.js' (Utiliza apiFetch e exibirErro)
 * RESPONSABILIDADE: Buscar, formatar, filtrar, paginar e exibir o
 * histórico completo de chamados com sua linha do tempo de ações
 * (check-in, abastecimento, incidente, check-out, cancelamento).
 * Consome: GET /dashboard/history/full?page=N&size=N
 * ===================================================================
 */

// ===================================================================
// 1. ESTADO GLOBAL
// ===================================================================

/** Cache da página atual de chamados (para filtros sem nova requisição) */
let chamadosHistorico = [];

/** Metadados de paginação retornados pela API */
let paginacaoAtual = { page: 0, size: 10, totalPages: 0, totalElements: 0 };

/** Página que está sendo exibida no momento */
let paginaAtual = 0;

/** Tamanho fixo da página (quantidade de chamados por requisição) */
const ITENS_POR_PAGINA = 10;


// ===================================================================
// 2. INTEGRAÇÃO API E PROCESSAMENTO DE DADOS
// ===================================================================

/**
 * Função: carregarPagina
 * O que faz: Faz a requisição ao backend para buscar uma página específica
 * do histórico completo de chamados, armazena o resultado no estado global
 * e dispara a renderização.
 *
 * @param {number} page - Número da página a carregar (base 0).
 */
async function carregarPagina(page) {
    const container = document.getElementById("historicoLista");
    if (!container) return;

    container.innerHTML = '<p style="text-align:center; padding: 20px;">Carregando histórico...</p>';

    try {
        // Usa o wrapper global que injeta o Bearer Token automaticamente
        const response = await window.apiFetch(
            `/dashboard/history/full?page=${page}&size=${ITENS_POR_PAGINA}`,
            { method: "GET" }
        );

        // basic.js intercepta 401/403 e retorna null (sessão expirada)
        if (!response) return;

        if (!response.ok) {
            const erroTexto = await response.text();
            window.exibirErro(
                `Status HTTP: ${response.status} (${response.statusText})`,
                erroTexto,
                "#historicoLista"
            );
            return;
        }

        const data = await response.json();

        // Armazena os dados da página atual e os metadados de paginação
        chamadosHistorico = data.content || [];
        
        // Ordena decrescente por id (serviceId)
        chamadosHistorico.sort((a, b) => (b.serviceId || 0) - (a.serviceId || 0));

        paginacaoAtual = {
            page:          data.page,
            size:          data.size,
            totalPages:    data.totalPages,
            totalElements: data.totalElements,
            isLast:        data.last,
        };
        paginaAtual = data.page;

        renderizarChamados(chamadosHistorico);
        atualizarKpisHistorico(chamadosHistorico, paginacaoAtual.totalElements);
        renderizarPaginacao();

    } catch (error) {
        console.error("Erro Crítico no Histórico:", error);
        window.exibirErro("Erro de Comunicação JavaScript", error.message, "#historicoLista");
    }
}

/**
 * Função: inicializarHistorico
 * O que faz: Ponto de entrada. Carrega a primeira página e vincula
 * o listener de busca ao campo de texto.
 */
async function inicializarHistorico() {
    if (!document.getElementById("historicoLista")) return;

    await carregarPagina(0);

    // Atalho de teclado: Enter no campo de busca dispara o filtro local
    const campoBusca = document.getElementById("filtroBusca");
    if (campoBusca) {
        campoBusca.addEventListener("keyup", (e) => {
            if (e.key === "Enter") window.aplicarFiltrosHistorico();
        });
    }
}


// ===================================================================
// 3. COMPONENTES VISUAIS (Cards, Timeline, KPIs, Paginação)
// ===================================================================

/**
 * Função: atualizarKpisHistorico
 * O que faz: Atualiza os 4 cards de KPI na parte superior da tela.
 * Usa o total geral vindo da paginação para "Total no período".
 *
 * @param {Array}  lista         - Chamados da página atual.
 * @param {number} totalGlobal   - Total de chamados de todas as páginas.
 */
function atualizarKpisHistorico(lista, totalGlobal) {
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    set("kpi-total",      totalGlobal);
    set("kpi-finalizados", lista.filter(c => !c.isActive).length);
    set("kpi-andamento",   lista.filter(c => c.isActive).length);
    set("kpi-novos",       lista.filter(c => c.hasIncidents).length);
}

/**
 * Função: formatarData
 * O que faz: Converte uma string de data ISO para o formato curto pt-BR.
 *
 * @param {string} dataString - Data no formato ISO 8601.
 * @returns {string} Data formatada ou string vazia se ausente.
 */
function formatarData(dataString) {
    if (!dataString) return "";
    return new Date(dataString).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    });
}

/**
 * Função: montarDetalhe
 * O que faz: Gera o bloco HTML de um campo de detalhe (label + valor).
 *
 * @param {string} label - Nome do campo.
 * @param {string} value - Valor a exibir.
 * @returns {string} HTML do bloco.
 */
function montarDetalhe(label, value) {
    return `<div class="detalhe-bloco">
                <span class="detalhe-label">${label}</span>
                <strong>${value || "Não informado"}</strong>
            </div>`;
}

/**
 * Função: obterConfigEvento
 * O que faz: Retorna o ícone e a cor associados a cada tipo de evento,
 * mantendo a identidade visual consistente na timeline.
 *
 * @param {string} type - Tipo do evento (CHECK_IN, REFUELING, INCIDENT, etc.).
 * @returns {{ icon: string, color: string }}
 */
function obterConfigEvento(type) {
    const mapa = {
        CHECK_IN:            { icon: "🟢", color: "#14804a" },
        CHECK_OUT:           { icon: "🔵", color: "#0d36b1" },
        REFUELING:           { icon: "🟡", color: "#8d6200" },
        INCIDENT:            { icon: "🔴", color: "#d40000" },
        ARRIVAL_AT_LOCATION: { icon: "🟣", color: "#6a0dad" },
        SERVICE_COMPLETION:  { icon: "✅", color: "#14804a" },
        RETURN_TRIP:         { icon: "🔷", color: "#002080" },
    };
    return mapa[type] || { icon: "⚪", color: "#546583" };
}

/**
 * Função: montarTimeline
 * O que faz: Constrói o HTML da linha do tempo de eventos de um chamado.
 * Exibe até 3 eventos inline e o restante em colapso (detalhes no popup).
 *
 * @param {Array} events - Lista de eventos do chamado.
 * @returns {string} HTML da timeline.
 */
function montarTimeline(events) {
    if (!events || events.length === 0) {
        return `<p class="historico-observacao" style="font-style:italic;">Nenhuma ação registrada ainda.</p>`;
    }

    const itens = events.map(ev => {
        const cfg  = obterConfigEvento(ev.type);
        const hora = ev.date ? formatarData(ev.date) : "—";
        const km   = ev.km ? ` • ${ev.km} km` : "";
        
        let detalhesExtras = "";
        
        if (ev.type === "REFUELING") {
            const combustivel = ev.fuelType || "Combustível";
            const litros = ev.liters ? `${ev.liters.toFixed(2)}L` : "";
            const preco = ev.pricePerLiter ? `R$ ${ev.pricePerLiter.toFixed(2)}/L` : "";
            const total = ev.totalAmount ? `Total: R$ ${ev.totalAmount.toFixed(2)}` : "";
            const posto = ev.gasStationName ? `Posto: ${ev.gasStationName}` : "";
            const nf = ev.invoice ? `NF: ${ev.invoice}` : "";
            
            detalhesExtras = `<div style="
                margin-top: 4px; padding: 6px 10px; 
                background: #fffdf5; border: 1px dashed #ffd97d; 
                border-radius: 4px; font-size: 11px; color: #7a5300; 
                display: flex; flex-wrap: wrap; gap: 8px;">
                <span>⛽ <strong>${combustivel}</strong></span>
                ${litros ? `<span>💧 ${litros}</span>` : ""}
                ${preco ? `<span>🏷️ ${preco}</span>` : ""}
                ${total ? `<span>💰 <strong>${total}</strong></span>` : ""}
                ${posto ? `<span>🏢 ${posto}</span>` : ""}
                ${nf ? `<span>📄 ${nf}</span>` : ""}
            </div>`;
        } else if (ev.type === "INCIDENT") {
            const gravidade = ev.severity === "CRITICAL" ? "Crítica" : ev.severity === "MEDIUM" ? "Média" : "Baixa";
            const gravidadeCls = ev.severity === "CRITICAL" ? "background:#ffebee;color:#c62828;" : "background:#fff3e0;color:#ef6c00;";
            const resolvido = ev.resolved ? "🟢 Resolvido" : "🔴 Pendente";
            
            detalhesExtras = `<div style="
                margin-top: 4px; padding: 6px 10px; 
                background: #fdf5f5; border: 1px dashed #ffb3b3; 
                border-radius: 4px; font-size: 11px; color: #a80000; 
                display: flex; flex-wrap: wrap; gap: 8px;">
                <span style="padding:1px 6px; border-radius:3px; ${gravidadeCls}"><strong>Severidade: ${gravidade}</strong></span>
                <span>${resolvido}</span>
            </div>`;
        }

        const nota = ev.note ? `<small style="display:block;color:#546583;margin-top:2px;">${ev.note}</small>` : "";

        return `<li style="
            display:flex; align-items:flex-start; gap:10px;
            padding: 8px 0; border-bottom: 1px solid #eef1f8;">
            <span style="font-size:18px; line-height:1;">${cfg.icon}</span>
            <div style="flex: 1;">
                <strong style="color:${cfg.color}; font-size:13px;">${ev.label}</strong>
                <small style="display:block; color:#617292; font-size:12px;">${hora}${km}</small>
                ${nota}
                ${detalhesExtras}
            </div>
        </li>`;
    }).join("");

    return `<ul style="list-style:none; padding:0; margin: 10px 0 0 0;">${itens}</ul>`;
}

/**
 * Função: traduzirPrioridade
 * O que faz: Mapeia o enum de prioridade para label e classe CSS.
 *
 * @param {string} rawPriority - Valor bruto do enum (HIGH, MEDIUM, LOW, SCHEDULED).
 * @returns {{ label: string, cls: string }}
 */
function traduzirPrioridade(rawPriority) {
    const mapa = {
        HIGH:      { label: "Alta",       cls: "prioridade-alta"  },
        MEDIUM:    { label: "Média",      cls: "prioridade-media" },
        LOW:       { label: "Baixa",      cls: "prioridade-baixa" },
        SCHEDULED: { label: "Agendado",   cls: "prioridade-baixa" },
    };
    return mapa[rawPriority] || { label: "Média", cls: "prioridade-media" };
}

/**
 * Função: renderizarChamados
 * O que faz: Constrói os cards do histórico com base na lista de chamados
 * recebida. Chamados em andamento (isActive=true) recebem estilo diferenciado.
 *
 * @param {Array} lista - Lista de chamados a renderizar.
 */
function renderizarChamados(lista) {
    const container = document.getElementById("historicoLista");
    if (!container) return;

    if (!lista || lista.length === 0) {
        container.innerHTML = `<div class="nenhum-registro">Nenhum chamado encontrado para os filtros aplicados.</div>`;
        return;
    }

    container.innerHTML = lista.map((chamado) => {
        // Chamados com isActive=true ainda estão em andamento
        const ativo       = chamado.isActive === true;
        const statusStr   = ativo ? "andamento"  : "finalizado";
        const statusLabel = ativo ? "Em andamento" : "Finalizado";
        const statusClass = ativo ? "status-andamento" : "status-finalizado";
        const itemClass   = ativo ? "item-andamento"   : "item-finalizado";

        const { label: prioLabel, cls: prioClass } = traduzirPrioridade(chamado.priority);

        const tecnico = chamado.technician?.name || "Não informado";
        const viatura = chamado.vehicle
            ? `${chamado.vehicle.prefix} — ${chamado.vehicle.brand || ""} ${chamado.vehicle.model || ""}`.trim()
            : "Não informada";

        const saida      = formatarData(chamado.departureTime)  || "—";
        const conclusao  = formatarData(chamado.completionTime) || "—";
        const destino    = chamado.destinationRequester || "Não informado";
        const descricao  = chamado.description          || "Sem descrição registrada.";

        // Bloco de detalhes resumidos abaixo do cabeçalho do card
        let detalhes = montarDetalhe("Responsável", tecnico)
                     + montarDetalhe("Viatura",     viatura)
                     + montarDetalhe("Saída",       saida)
                     + montarDetalhe("Destino",     destino);

        if (!ativo) {
            detalhes += montarDetalhe("Conclusão", conclusao);
        }

        // Indicador extra para chamados com incidentes
        const badgeIncidente = chamado.hasIncidents
            ? `<span class="status-chip status-indicar" style="font-size:11px; margin-left:6px;">⚠ Incidente</span>`
            : "";

        // Indicador extra para chamados ativos (destaque adicional)
        const badgeAtivo = ativo
            ? `<span style="
                display:inline-flex; align-items:center;
                background:#fff8e1; color:#8d6200;
                border:1px solid #f0a500; border-radius:999px;
                padding:3px 10px; font-size:11px; font-weight:700;
                margin-left:6px;">🔔 Em campo</span>`
            : "";

        return `
            <article class="historico-item ${itemClass}" id="chamado-${chamado.serviceId}">
                <div class="historico-item-topo">
                    <div>
                        <div class="historico-header-linha">
                            <span class="historico-numero">Chamado #${chamado.serviceId}</span>
                            <span class="status-chip ${statusClass}">${statusLabel}</span>
                            ${badgeAtivo}
                            ${badgeIncidente}
                        </div>
                        <h3>${ativo ? "Chamado em Andamento" : "Chamado Finalizado"}</h3>
                        <p class="historico-subtitulo">${viatura} • ${tecnico}</p>
                    </div>
                    <div class="historico-prioridade ${prioClass}">${prioLabel}</div>
                </div>

                <div class="historico-detalhes">${detalhes}</div>

                <p class="historico-observacao">${descricao}</p>

                <div style="margin-top:12px;">
                    <strong style="font-size:13px; color:#1f2d48; display:block; margin-bottom:4px;">
                        Linha do tempo (${chamado.events?.length || 0} ações)
                    </strong>
                    ${montarTimeline(chamado.events)}
                </div>

                <button
                    type="button"
                    class="btn-detalhes"
                    style="margin-top:14px;"
                    onclick="window.abrirDetalhesChamado(${chamado.serviceId})">
                    Ver detalhes completos
                </button>
            </article>
        `;
    }).join("");
}

/**
 * Função: renderizarPaginacao
 * O que faz: Gera os controles de paginação (Anterior / indicador de página / Próximo)
 * abaixo da lista de chamados. Só exibe se houver mais de uma página.
 */
function renderizarPaginacao() {
    // Cria o container de paginação se ainda não existir
    let paginacaoEl = document.getElementById("historico-paginacao");
    if (!paginacaoEl) {
        paginacaoEl = document.createElement("div");
        paginacaoEl.id = "historico-paginacao";
        paginacaoEl.style.cssText = `
            display: flex; justify-content: center; align-items: center;
            gap: 12px; margin-top: 20px; padding: 8px 0;
        `;

        const lista = document.getElementById("historicoLista");
        if (lista && lista.parentNode) {
            lista.parentNode.insertBefore(paginacaoEl, lista.nextSibling);
        }
    }

    // Oculta a paginação quando há apenas uma página
    if (paginacaoAtual.totalPages <= 1) {
        paginacaoEl.style.display = "none";
        return;
    }

    paginacaoEl.style.display = "flex";

    const btnAnterior = `
        <button
            id="btn-pag-anterior"
            class="btn-limpar-filtro"
            style="min-height:40px; padding:0 18px;"
            onclick="window.irParaPagina(${paginaAtual - 1})"
            ${paginaAtual === 0 ? "disabled" : ""}>
            ← Anterior
        </button>`;

    const indicador = `
        <span style="font-size:14px; font-weight:700; color:#002080;">
            Página ${paginaAtual + 1} de ${paginacaoAtual.totalPages}
            <small style="font-weight:400; color:#617292; margin-left:6px;">
                (${paginacaoAtual.totalElements} chamados no total)
            </small>
        </span>`;

    const btnProximo = `
        <button
            id="btn-pag-proximo"
            class="btn-acao-filtrar"
            style="min-height:40px; padding:0 18px;"
            onclick="window.irParaPagina(${paginaAtual + 1})"
            ${paginacaoAtual.isLast ? "disabled" : ""}>
            Próxima →
        </button>`;

    paginacaoEl.innerHTML = btnAnterior + indicador + btnProximo;
}


// ===================================================================
// 4. SISTEMA DE BUSCA E FILTROS (Filtro local na página atual)
// ===================================================================

/**
 * Função: aplicarFiltrosHistorico (exposta globalmente)
 * O que faz: Filtra localmente o cache da página atual pelos termos digitados
 * no campo de busca (matrícula, nome do técnico, prefixo da viatura).
 * Não faz nova requisição ao servidor.
 */
window.aplicarFiltrosHistorico = function () {
    const input = document.getElementById("filtroBusca");
    if (!input) return;

    const busca = input.value.trim().toLowerCase();

    const filtrados = chamadosHistorico.filter((c) => {
        if (!busca) return true;

        const tecnico = (c.technician?.name || "").toLowerCase();
        const matricula = (c.technician?.registration || "").toLowerCase();
        const prefixo = (c.vehicle?.prefix || "").toLowerCase();
        const destino = (c.destinationRequester || "").toLowerCase();

        return tecnico.includes(busca)
            || matricula.includes(busca)
            || prefixo.includes(busca)
            || destino.includes(busca);
    });

    renderizarChamados(filtrados);
};

/**
 * Função: irParaPagina (exposta globalmente)
 * O que faz: Navega para a página informada, fazendo nova requisição ao servidor.
 * Limpa o campo de busca ao navegar para evitar inconsistências visuais.
 *
 * @param {number} page - Número da página de destino (base 0).
 */
window.irParaPagina = async function (page) {
    if (page < 0 || page >= paginacaoAtual.totalPages) return;

    // Limpa o filtro local ao navegar de página
    const campoBusca = document.getElementById("filtroBusca");
    if (campoBusca) campoBusca.value = "";

    // Rola suavemente para o topo da lista antes de carregar
    document.getElementById("historicoLista")?.scrollIntoView({ behavior: "smooth" });

    await carregarPagina(page);
};


// ===================================================================
// 5. CONTROLE DE MODAIS (Popup de Detalhes Completos)
// ===================================================================

/**
 * Função: abrirDetalhesChamado (exposta globalmente)
 * O que faz: Abre o popup com todas as informações e a linha do tempo
 * completa do chamado selecionado.
 *
 * @param {number} id - serviceId do chamado.
 */
window.abrirDetalhesChamado = function (id) {
    const chamado = chamadosHistorico.find((c) => c.serviceId === id);
    if (!chamado) return;

    const ativo       = chamado.isActive === true;
    const statusLabel = ativo ? "Em andamento" : "Finalizado";
    const tecnico     = chamado.technician?.name || "Desconhecido";
    const matricula   = chamado.technician?.registration || "—";
    const viatura     = chamado.vehicle
        ? `${chamado.vehicle.prefix} — ${chamado.vehicle.brand || ""} ${chamado.vehicle.model || ""}`.trim()
        : "Não informada";

    // Atualiza o título do popup
    const popupTitulo = document.getElementById("popupDetalhesTitulo");
    if (popupTitulo) {
        popupTitulo.textContent = `Chamado #${chamado.serviceId} • ${statusLabel}`;
    }

    // Monta o corpo do popup com os dados do chamado + timeline completa
    const popupConteudo = document.getElementById("popupDetalhesConteudo");
    if (popupConteudo) {
        const { label: prioLabel } = traduzirPrioridade(chamado.priority);

        const gridDados = `
            <div class="popup-grid">
                ${montarDetalhe("Técnico",    tecnico)}
                ${montarDetalhe("Matrícula",  matricula)}
                ${montarDetalhe("Viatura",    viatura)}
                ${montarDetalhe("Saída",      formatarData(chamado.departureTime)  || "—")}
                ${montarDetalhe("KM Saída",   chamado.departureKm ? chamado.departureKm + " km" : "—")}
                ${montarDetalhe("KM Chegada", chamado.arrivalKm   ? chamado.arrivalKm   + " km" : "—")}
                ${montarDetalhe("Destino",    chamado.destinationRequester || "—")}
                ${montarDetalhe("Prioridade", prioLabel)}
                ${!ativo ? montarDetalhe("Conclusão", formatarData(chamado.completionTime) || "—") : ""}
            </div>`;

        // Observação geral do chamado
        const obsHtml = `
            <div class="popup-obs" style="margin-top: 15px;">
                <strong>Descrição:</strong>
                <p style="background:#f9f9f9; padding:10px; border-radius:5px; margin-top:5px; border-left:3px solid #002080;">
                    ${chamado.description || "Sem descrição registrada."}
                </p>
            </div>`;

        // Linha do tempo completa de eventos
        const timelineHtml = `
            <div style="margin-top: 18px;">
                <strong style="font-size:14px; color:#1f2d48;">
                    Linha do tempo — ${chamado.events?.length || 0} ações registradas
                </strong>
                ${montarTimeline(chamado.events)}
            </div>`;

        popupConteudo.innerHTML = gridDados + obsHtml + timelineHtml;
    }

    const modal = document.getElementById("popupChamadoDetalhes");
    if (modal) modal.style.display = "flex";
};

/**
 * Função: fecharPopupChamadoDetalhes (exposta globalmente)
 * O que faz: Fecha o popup de detalhes.
 */
window.fecharPopupChamadoDetalhes = function () {
    const modal = document.getElementById("popupChamadoDetalhes");
    if (modal) modal.style.display = "none";
};


// ===================================================================
// 6. INICIALIZAÇÃO DE EVENTOS DOM
// ===================================================================

document.addEventListener("DOMContentLoaded", () => {
    // Garante que só roda se a div principal de histórico existir na tela atual
    if (document.getElementById("historicoLista")) {
        inicializarHistorico();
    }
});