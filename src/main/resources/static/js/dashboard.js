/**
 * ===================================================================
 * ARQUIVO: dashboard.js
 * REFERÊNCIA GLOBAL: Requer 'basic.js' (Utiliza apiFetch, exibirErro)
 * RESPONSABILIDADE: Carregar KPIs (métricas principais) e o Resumo
 * do Histórico de chamados na tela inicial do Gestor.
 * ===================================================================
 */

/**
 * Função: carregarMetricasDashboard
 * O que faz: Busca as métricas consolidadas (veículos, técnicos, gastos) no backend
 * e atualiza os cards numéricos da tela do gestor. Formata automaticamente
 * moedas (R$) e números inteiros.
 * Requisição: GET /dashboard/metrics
 */
async function carregarMetricasDashboard() {
    try {
        // Utiliza o wrapper global que injeta o token e lida com erros de sessão
        const response = await window.apiFetch("/dashboard/metrics", { method: "GET" });
        if (!response) return; // Interceptado pelo basic.js (ex: token expirado)

        if (!response.ok) {
            const erroTexto = await response.text();
            // Utiliza a UI global de erro caso o servidor retorne falha
            window.exibirErro(`Status HTTP: ${response.status}`, erroTexto, ".quadros-container");
            return;
        }

        const metricas = await response.json();

        // Funções auxiliares locais para formatação visual
        const formatarMoeda = (valor) => `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const formatarNumero = (valor) => valor.toLocaleString('pt-BR');

        // Mapeamento dinâmico: Chave é o ID do elemento HTML, Valor é o dado da API
        const mapaMetricas = {
            "val-disponiveis": metricas.availableCars,
            "val-manutencao": metricas.maintenanceCars,
            "val-uso": metricas.inUseCars,
            "val-tecnicos-disp": metricas.availableTechnicians,
            "val-tecnicos-serv": metricas.onDutyTechnicians,
            "val-gasto-mensal": metricas.monthlyFuelSpend !== undefined ? formatarMoeda(metricas.monthlyFuelSpend) : undefined,
            "val-preco-litro": metricas.averagePricePerLiter !== undefined ? formatarMoeda(metricas.averagePricePerLiter) : undefined,
            "val-litros": metricas.totalLitersRefueled !== undefined ? `${formatarNumero(metricas.totalLitersRefueled)} L` : undefined
        };

        // Itera sobre o mapa e injeta os valores no DOM de forma segura
        Object.entries(mapaMetricas).forEach(([id, valor]) => {
            if (valor !== undefined) {
                const el = document.getElementById(id);
                if (el) el.textContent = valor;
            }
        });

    } catch (error) {
        console.error("Erro de conexão ao buscar métricas:", error);
        window.exibirErro("Falha de Comunicação", error.message, ".quadros-container");
    }
}

/**
 * Função: carregarResumoHistorico
 * O que faz: Consome os últimos registros de auditoria do sistema (via Hibernate Envers)
 * e injeta uma lista simplificada das últimas 5 atividades recentes na tela inicial.
 * Requisição: GET /dashboard/history
 */
async function carregarResumoHistorico() {
    const container = document.getElementById("chamados-recentes-lista");
    if (!container) return; // Aborta silenciosamente se a div não existir na tela atual

    try {
        const response = await window.apiFetch("/dashboard/history", { method: "GET" });
        if (!response) return;

        if (!response.ok) {
            container.innerHTML = `<div class="nenhum-registro" style="color:red;">Erro ${response.status} ao carregar histórico.</div>`;
            return;
        }

        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            container.innerHTML = `<div class="nenhum-registro">Nenhum chamado registrado no histórico.</div>`;
            return;
        }

        // Atualiza contadores rápidos de status (se as tags existirem no layout)
        const ativos = data.filter(rev => rev.entity && rev.entity.completionTime === null).length;
        const concluidos = data.filter(rev => rev.entity && rev.entity.completionTime !== null).length;

        if (document.getElementById("resumo-ativos")) document.getElementById("resumo-ativos").textContent = ativos;
        if (document.getElementById("resumo-concluidos")) document.getElementById("resumo-concluidos").textContent = concluidos;

        // Limita as renderizações aos 5 eventos mais recentes para não poluir o dashboard
        const recentesHtml = data.slice(0, 5).map(rev => {
            if (!rev.entity) return "";

            const isFinalizado = rev.entity.completionTime !== null;
            const statusStr = isFinalizado ? "finalizado" : "andamento";
            const statusLabelStr = isFinalizado ? "Finalizado" : "Em andamento";

            // Processamento da data baseada no log de auditoria
            const dataAbertura = new Date(rev.revisionDate || rev.entity.departureTime || new Date());
            const horaStr = `${String(dataAbertura.getHours()).padStart(2, '0')}:${String(dataAbertura.getMinutes()).padStart(2, '0')}`;

            const titulo = rev.revisionType === 'ADD' ? "Abertura de Chamado" : "Atualização de Chamado";
            const prefixo = rev.entity.car?.prefix || "N/A";
            const tecnico = rev.entity.user?.name || "N/A";
            const destino = rev.entity.destinationRequester || "Local não informado";

            // Retorna o template HTML do card de auditoria
            return `
                <article class="item-chamado item-${statusStr}">
                    <div class="item-chamado-principal">
                        <div class="item-chamado-topo">
                            <span class="chamado-numero">N° ${rev.entity.id}</span>
                            <span class="status-chip status-${statusStr}">${statusLabelStr}</span>
                        </div>
                        <h3>${titulo}</h3>
                        <div class="dados-veiculo">Viatura ${prefixo} | Técnico: ${tecnico}</div>
                        <div class="meta-chamado">
                            <span>${destino}</span>
                            <span>Horário: ${horaStr}</span>
                        </div>
                    </div>
                    <button class="btn-status status-${statusStr}" onclick="window.location.href='historicochamados.html'">Ver histórico</button>
                </article>
            `;
        }).join("");

        container.innerHTML = recentesHtml;

    } catch (error) {
        console.error("Erro ao carregar resumo de histórico:", error);
        container.innerHTML = `<div class="nenhum-registro" style="color:red;">Falha ao comunicar com o servidor.</div>`;
    }
}

/**
 * Bloco de Inicialização: Event Listeners
 * O que faz: Aguarda o carregamento do DOM. Se a URL corresponder à tela do
 * gestor (ou contiver a classe específica), dispara o carregamento dos widgets.
 */
document.addEventListener("DOMContentLoaded", () => {
    const isTelaGestor = document.querySelector(".dashboard-gestor") || window.location.pathname.includes("telainicial-gestor.html");

    if (isTelaGestor) {
        carregarMetricasDashboard();
        carregarResumoHistorico();
    }
});