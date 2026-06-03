/**
 * ===================================================================
 * ARQUIVO: ui.js
 * REFERÊNCIA GLOBAL: Requer 'basic.js' e 'service.js'
 * RESPONSABILIDADE: Controle de acesso (Client-Side), manipulação de sidebars,
 * fechamento de modais, escuta de eventos de teclado e controle do fluxo visual.
 * ===================================================================
 */

// ===================================================================
// 1. ESCUTADORES GLOBAIS DE TECLADO (Ações via Enter)
// ===================================================================
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        const focusedElement = document.activeElement;

        // Tela de Login
        if (focusedElement.id === 'matricula' || focusedElement.id === 'senha') {
            event.preventDefault();
            if (typeof window.btnindex === "function") window.btnindex();
        }

        // Tela Inicial (Check-in rápido)
        if (focusedElement.id === 'quilometragem-inicial' || focusedElement.id === 'observacoes') {
            event.preventDefault();
            if (typeof window.salvarVeiculoInfo === "function") window.salvarVeiculoInfo();
        }
    }
});

// ===================================================================
// 2. INICIALIZAÇÃO DA PÁGINA E CONTROLE DE ACESSO
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {

    // --- CONTROLE DE ACESSO POR PERFIL (TRAVA DE SEGURANÇA) ---
    const rawPermission = localStorage.getItem("userPermission") || "";
    const permission = rawPermission.trim().toUpperCase().replace("ROLE_", ""); // Padroniza string
    const currentPage = window.location.pathname;

    const gestorPages = [
        "telainicial-gestor.html", "relatorios.html", "configuracoes-gestor.html",
        "cadastrousuarios.html", "cadastroveiculos.html", "historicochamados.html"
    ];

    const technicianPages = [
        "telainicial.html", "chamados.html", "configuracoes-tecnico.html"
    ];

    if (permission) {
        const isGestorPage = gestorPages.some(page => currentPage.includes(page));
        const isTechnicianPage = technicianPages.some(page => currentPage.includes(page));

        // Expulsa técnicos que tentam acessar rotas do gestor
        if (isGestorPage && permission !== "ADMINISTRATOR" && permission !== "MANAGER") {
            window.location.href = "telainicial.html";
            return;
        }

        // Expulsa gestores (ou perfis inválidos) de rotas exclusivas da interface operacional
        if (isTechnicianPage && permission !== "TECHNICIAN" && permission !== "ADMINISTRATOR") {
            window.location.href = "telainicial-gestor.html";
            return;
        }
    }

    // Inicializa a exibição de dados da tela principal
    if (typeof window.carregarDadosTelaInicial === "function") {
        window.carregarDadosTelaInicial();
    }

    // --- CONFIGURAÇÃO DA SIDEBAR E OVERLAYS ---
    const btnMenu = document.getElementById("btnmenu");
    const sidebar = document.getElementById("sidebar");
    const overlaySidebar = document.getElementById("overlayBlurSidebar");
    const btnClose = document.getElementById("btnx");

    const openSidebar = () => {
        if (sidebar) {
            sidebar.style.width = "250px"; // Fallback legado
            sidebar.classList.add("open"); // Nova interface
        }
        if (overlaySidebar) overlaySidebar.classList.add("active");
    };

    const closeSidebar = () => {
        if (sidebar) {
            sidebar.style.width = "0"; // Fallback legado
            sidebar.classList.remove("open"); // Nova interface
        }
        if (overlaySidebar) overlaySidebar.classList.remove("active");
    };

    if (btnMenu) btnMenu.onclick = openSidebar;
    if (btnClose) btnClose.onclick = closeSidebar;
    if (overlaySidebar) overlaySidebar.onclick = closeSidebar;

    // Fecha todos os modais ao clicar no overlay escuro de fundo da tela
    document.querySelectorAll(".sobreposicao").forEach(overlay => {
        overlay.addEventListener("click", event => {
            if (event.target === overlay) {
                window.fecharTodosModais();
            }
        });
    });

    // --- FLUXO DE VALIDAÇÃO VISUAL DO ABASTECIMENTO ---
    const popupAbs = document.getElementById('popupAbastecimento');
    const popupConf = document.getElementById('popupConfirmacao') || document.getElementById('popupConfirmacaoAbs');
    const popupSuc = document.getElementById('popupSucesso');

    const btnVoltarAbs = document.getElementById('btn-voltar') || document.querySelector('#popupAbastecimento .btn-voltar');
    const btnSalvarAbs = document.getElementById('btn-salvar-abastecimento');
    const btnCancelaConf = document.getElementById('btn-cancelar-confirmacao') || document.querySelector('#popupConfirmacao .btn-voltar');
    const btnConfirmaFin = document.getElementById('btn-confirmar-final');
    const btnFechaSuc = document.getElementById('btn-fechar-sucesso');

    // Retorna para a tela base
    if (btnVoltarAbs) {
        btnVoltarAbs.onclick = () => { if (popupAbs) popupAbs.style.display = "none"; };
    }

    // Validação de Frontend antes de avançar para a tela de confirmação
    if (btnSalvarAbs && popupAbs && popupConf) {
        btnSalvarAbs.onclick = () => {
            // Combinação dos campos obrigatórios antigos e novos da interface mockada
            const camposIds = ['litros-abastecimento', 'preco-litro', 'km-veiculo', 'nf-abastecimento', 'data-abastecimento', 'hora-abastecimento', 'troca-oleo'];
            let algumVazio = false;

            camposIds.forEach(id => {
                const input = document.getElementById(id);
                if (input) {
                    if (input.value.trim() === "") {
                        input.style.borderColor = "red";
                        algumVazio = true;
                    } else {
                        input.style.borderColor = "#252020";
                    }
                }
            });

            if (algumVazio) {
                window.mostrarToast("Preencha todos os campos obrigatórios!");
                return;
            }

            // Oculta o formulário e exibe o modal de confirmação
            popupAbs.style.display = 'none';
            popupConf.style.display = 'flex';
        };
    }

    // Cancela a confirmação e volta pro formulário de abastecimento
    if (btnCancelaConf && popupAbs && popupConf) {
        btnCancelaConf.onclick = () => {
            popupConf.style.display = 'none';
            popupAbs.style.display = 'flex';
        };
    }

    // Confirmar Final: Aciona o service.js (onde está o fetch) para persistir na API
    if (btnConfirmaFin) {
        btnConfirmaFin.onclick = () => {
            if (typeof window.registrarAbastecimento === "function") {
                window.registrarAbastecimento();
            } else {
                console.error("Função registrarAbastecimento não encontrada. Verifique o service.js");
            }
        };
    }

    // Fechar Modal de Sucesso Genérico
    if (btnFechaSuc) {
        btnFechaSuc.onclick = () => { if (popupSuc) popupSuc.style.display = 'none'; };
    }
});

// ===================================================================
// 3. FUNÇÕES GLOBAIS DE MANIPULAÇÃO DE UI (Window Scope)
// ===================================================================

window.abrirModalConfirmacao = () => {
    const modal = document.getElementById("modalConfirmacao");
    if (modal) modal.style.display = "flex";
};

window.fecharTodosModais = () => {
    // Array com IDs das duas versões
    const modais = [
        "modalConfirmacao", "modalDetalhesVeiculo", "popupAbastecimento",
        "popupConfirmacao", "popupConfirmacaoAbs", "modalAvisoCheckout", "popupSucesso"
    ];

    modais.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = "none";
    });

    const sidebar = document.getElementById("sidebar");
    const overlaySidebar = document.getElementById("overlayBlurSidebar");
    if (sidebar) {
        sidebar.style.width = "0";
        sidebar.classList.remove("open");
    }
    if (overlaySidebar) overlaySidebar.classList.remove("active");
};

// ===================================================================
// 4. INJEÇÃO DE DADOS INICIAIS (BASEADO NO ESTADO LOCAL)
// ===================================================================

window.carregarDadosTelaInicial = function () {
    // 1. Tratamento de Boas-vindas
    const userName = localStorage.getItem('userName');
    if (userName) {
        const technGreeting = document.getElementById('boas-vindas-titulo');
        const mangGreeting = document.getElementById('nome-usuario-logado');
        if (technGreeting) technGreeting.textContent = `Bem vindo, ${userName}!`;
        if (mangGreeting) mangGreeting.textContent = userName;
    }

    // 2. Leitura de estado de veículos e serviço
    const vehicleData = localStorage.getItem("selectedVehicle");
    const activeServiceId = localStorage.getItem("activeServiceId");

    const btnCheckin = document.getElementById("container-checkin-botao");
    const infoDados = document.getElementById("info-veiculo-dados");
    const postCheckin = document.getElementById("secao-pos-checkin");

    // Cenário A: Nenhum veículo selecionado na tela de inicio
    if (!vehicleData || vehicleData === "null") {
        if (btnCheckin) btnCheckin.style.setProperty('display', 'block', 'important');
        if (infoDados) infoDados.style.setProperty('display', 'none', 'important');
        if (postCheckin) postCheckin.style.setProperty('display', 'none', 'important');
        return;
    }

    // Cenário B: Veículo Selecionado (Preparando Check-in ou Em Serviço)
    try {
        const vehicle = JSON.parse(vehicleData);

        // Exibe o cabeçalho de dados da viatura escolhida
        if (infoDados) infoDados.style.setProperty('display', 'block', 'important');

        if (document.getElementById("display-modelo")) document.getElementById("display-modelo").textContent = vehicle.model || "-";
        if (document.getElementById("display-placa")) document.getElementById("display-placa").textContent = vehicle.licensePlate || "-";
        if (document.getElementById("display-prefixo")) document.getElementById("display-prefixo").textContent = vehicle.prefix || "-";

        // Preenche campos persistidos
        const kmInput = document.getElementById("quilometragem-inicial");
        const obsInput = document.getElementById("observacoes");
        if (kmInput) kmInput.value = localStorage.getItem("km") || "";
        if (obsInput) obsInput.value = localStorage.getItem("obs") || "";

        // Analisa se o veículo está com check-in concluído (Serviço Ativo)
        if (activeServiceId) {
            if (btnCheckin) btnCheckin.style.setProperty('display', 'none', 'important');
            if (postCheckin) postCheckin.style.setProperty('display', 'block', 'important');

            // Re-aplica a transformação de botões (Check-in -> Checkout/Abastecer)
            if (typeof window.transicaoPosCheckin === "function") {
                window.transicaoPosCheckin();
            }
        } else {
            // Analisa se apenas selecionou o carro, mas ainda precisa confirmar o Check-in
            if (btnCheckin) btnCheckin.style.setProperty('display', 'none', 'important');
            if (postCheckin) postCheckin.style.setProperty('display', 'block', 'important');
        }

    } catch (error) {
        console.error("Erro ao ler dados do veículo no localStorage:", error);
        localStorage.removeItem("selectedVehicle");
    }
};

// Mudar km
let valorKmOriginal = "";

function alternarEdicaoKM(editando) {
    const input = document.getElementById('quilometragem-inicial');
    const btnEdit = document.getElementById('btn-edit-km');
    const btnSave = document.getElementById('btn-save-km');
    const btnCancel = document.getElementById('btn-cancel-km');

    if (editando) {
        // Salva o valor atual antes de começar a editar
        valorKmOriginal = input.value;

        input.readOnly = false;
        input.focus();
        btnEdit.style.display = 'none';
        btnSave.style.display = 'flex';
        btnCancel.style.display = 'flex';
    } else {
        // Cancela: volta o valor original e tranca o campo
        input.value = valorKmOriginal;
        input.readOnly = true;
        btnEdit.style.display = 'flex';
        btnSave.style.display = 'none';
        btnCancel.style.display = 'none';
    }
}

function salvarEdicaoKM() {
    const input = document.getElementById('quilometragem-inicial');
    const btnEdit = document.getElementById('btn-edit-km');
    const btnSave = document.getElementById('btn-save-km');
    const btnCancel = document.getElementById('btn-cancel-km');

    // Aqui você pode adicionar validações (se é número, etc)
    if (input.value.trim() === "") {
        alert("Por favor, digite um valor.");
        return;
    }

    // Tranca o campo e volta ao estado inicial de botões
    input.readOnly = true;
    btnEdit.style.display = 'flex';
    btnSave.style.display = 'none';
    btnCancel.style.display = 'none';

    console.log("Nova KM salva:", input.value);
}

// Nota: O fluxo de cancelamento de check-in é controlado pelas
// funções onclick em service.js (confirmarCancelamentoCheckin, etc.)
// que se comunicam com a API do backend.


const popupConfirmacao = document.getElementById("popupConfirmacao");
const btnCancelarConfirmacao = document.getElementById("btn-cancelar-confirmacao");
const btnConfirmarFinal = document.getElementById("btn-confirmar-final");

// Variável para guardar o ID do chamado que o usuário quer apagar
let idChamadoParaDeletar = null;

/**
 * Função global para abrir o pop-up de confirmação
 * @param {number|string} id - O ID do chamado que será excluído
 */
window.abrirPopupConfirmacao = function(id) {
    idChamadoParaDeletar = id;
    if (popupConfirmacao) {
        popupConfirmacao.style.display = "flex"; // Abre o pop-up centralizado
    }
};

/**
 * Função global para fechar o pop-up
 */
window.fecharPopupConfirmacao = function() {
    idChamadoParaDeletar = null;
    if (popupConfirmacao) {
        popupConfirmacao.style.display = "none"; // Esconde o pop-up
    }
};

// Configura o botão "Voltar" (Cancelar) para fechar o pop-up
if (btnCancelarConfirmacao) {
    btnCancelarConfirmacao.addEventListener("click", window.fecharPopupConfirmacao);
}

// Configura o botão "Confirmar" para executar a exclusão
if (btnConfirmarFinal) {
    btnConfirmarFinal.addEventListener("click", function() {
        if (!idChamadoParaDeletar) return;

        // 1. Lógica de exclusão delegada para a função do mapa/serviço correspondente
        if (typeof window.executarExclusaoChamado === "function") {
            window.executarExclusaoChamado(idChamadoParaDeletar);
        } else {
            console.log("Chamado excluído com ID:", idChamadoParaDeletar);
            if (typeof window.mostrarToast === "function") {
                window.mostrarToast("Chamado excluído com sucesso!", "toast-aviso1");
            }
            window.fecharPopupConfirmacao();
        }
    });
}

// Fecha o pop-up se o usuário clicar no fundo escuro (fora do card de confirmação)
window.addEventListener("click", function(event) {
    if (event.target === popupConfirmacao) {
        window.fecharPopupConfirmacao();
    }
});