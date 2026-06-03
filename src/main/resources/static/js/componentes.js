/**
 * ===================================================================
 * ARQUIVO: componentes.js
 * RESPONSABILIDADE: Fornecer os templates HTML estruturais (Topbar, Sidebar)
 * e gerenciar os comportamentos visuais de navegação (Menu Mobile,
 * links ativos, expansão de submenus).
 * ===================================================================
 */

// ===================================================================
// 1. TEMPLATES HTML (Renderizadores)
// ===================================================================

window.renderizarTopBar = function (titulo) {
    return `
        <div class="top-bar">
            <div class="left">
                <button id="btnmenu" type="button" aria-label="Abrir menu">
                    <img src="img/menu.png" alt="Menu">
                </button>
                <span class="titulo" id="boas-vindas-titulo">${titulo}</span>
            </div>
            <div class="logout">
                <button id="btnlogout" type="button" onclick="window.btnlogout()" aria-label="Sair">
                    <img src="img/logout.png" alt="Sair">
                </button>
            </div>
        </div>
    `;
};

window.renderizarSidebarTecnico = function () {
    return `
        <div id="overlayBlurSidebar" class="overlay-blur-sidebar"></div>
        <div id="sidebar" class="sidebar">
            <button id="btnx" class="close-btn" type="button" aria-label="Fechar menu">&times;</button>
            
            <div class="sidebar-header">
                <span class="sidebar-kicker">SIVA</span>
                <strong class="sidebar-title">Painel do Técnico</strong>
                <p class="sidebar-subtitle">Navegue rapidamente entre as telas operacionais.</p>
            </div>
            
            <div class="sidebar-nav">
                <a href="telainicial.html">TELA INICIAL</a>
                <a href="chamados.html">CHAMADOS</a>
                <a href="configuracoes.html">CONFIGURAÇÕES</a>
            </div>
        </div>
    `;
};

window.renderizarSidebarGestor = function () {
    return `
        <div id="overlayBlurSidebar" class="overlay-blur-sidebar"></div>
        <div id="sidebar" class="sidebar">
            <button id="btnx" class="close-btn" type="button" aria-label="Fechar menu">&times;</button>
            
            <div class="sidebar-header">
                <span class="sidebar-kicker">SIVA</span>
                <strong class="sidebar-title">Painel do Gestor</strong>
                <p class="sidebar-subtitle">Acompanhe equipe, chamados e cadastros em um só lugar.</p>
            </div>
            
            <div class="sidebar-nav">
                <a href="telainicial-gestor.html">TELA INICIAL</a>
                <a href="telainicial.html">SELECIONAR VEÍCULO</a>
                <a href="chamados.html">SELECIONAR CHAMADOS</a>
                <a href="tela-mapa-gestor.html">GERENCIAR CHAMADOS</a>
                <a href="historicochamados.html">HISTÓRICO DE CHAMADOS</a>
                <a href="relatorios.html">RELATÓRIOS</a>
                
                <div class="sidebar-submenu-container">
                    <button class="sidebar-item-expandavel" type="button" aria-expanded="false">
                        <span class="sidebar-item-label">GERENCIAMENTO</span>
                        <span class="sidebar-item-icon">&#9662;</span>
                    </button>
                    <div class="sidebar-submenu">
                        <a href="veiculos-gestor.html" class="submenu-item">Gerenciar veículos</a>
                        <a href="tecnicos-gestor.html" class="submenu-item">Gerenciar usuários</a>
                    </div>
                </div>     
                
                <div class="sidebar-submenu-container">
                    <button class="sidebar-item-expandavel" type="button" aria-expanded="false">
                        <span class="sidebar-item-label">CADASTRO</span>
                        <span class="sidebar-item-icon">&#9662;</span>
                    </button>
                    <div class="sidebar-submenu">
                        <a href="cadastroveiculos.html" class="submenu-item">Cadastrar veículos</a>
                        <a href="cadastrousuarios.html" class="submenu-item">Cadastrar usuários</a>
                    </div>
                </div>
                
                <a href="configuracoes.html">CONFIGURAÇÕES</a>
            </div>
        </div>
    `;
};

// ===================================================================
// 2. FUNÇÕES AUXILIARES DE NAVEGAÇÃO E UI
// ===================================================================

function obterNomePaginaAtual() {
    const pathname = window.location.pathname || "";
    return pathname.split("/").pop().toLowerCase();
}

function atualizarEstadoCadastro(btnCadastro, submenuCadastro, expandido) {
    if (!btnCadastro || !submenuCadastro) return;

    btnCadastro.classList.toggle("active", expandido);
    btnCadastro.setAttribute("aria-expanded", String(expandido));
    submenuCadastro.classList.toggle("active", expandido);
}

function marcarLinkAtivo(sidebar) {
    if (!sidebar) return;

    const paginaAtual = obterNomePaginaAtual();
    const links = sidebar.querySelectorAll("a[href]");

    links.forEach((link) => {
        const href = (link.getAttribute("href") || "").toLowerCase();
        const ativo = href === paginaAtual;

        link.classList.toggle("active", ativo);
    });

    const submenus = sidebar.querySelectorAll(".sidebar-submenu-container");
    submenus.forEach((container) => {
        const btn = container.querySelector(".sidebar-item-expandavel");
        const submenu = container.querySelector(".sidebar-submenu");
        if (btn && submenu) {
            const linksSubmenu = submenu.querySelectorAll("a[href]");
            let contemAtivo = false;
            linksSubmenu.forEach((link) => {
                if (link.classList.contains("active")) {
                    contemAtivo = true;
                }
            });
            atualizarEstadoCadastro(btn, submenu, contemAtivo);
        }
    });
}

// ===================================================================
// 3. INICIALIZAÇÃO DE EVENTOS DO LAYOUT
// ===================================================================

window.inicializarComponentes = function () {
    const topbarContainer = document.getElementById("topbar-container");
    const sidebarContainer = document.getElementById("sidebar-container");

    const sidebar = sidebarContainer ? sidebarContainer.querySelector("#sidebar") : null;
    const overlay = sidebarContainer ? sidebarContainer.querySelector("#overlayBlurSidebar") : null;

    const btnMenu = topbarContainer ? topbarContainer.querySelector("#btnmenu") : null;
    const btnX = sidebar ? sidebar.querySelector("#btnx") : null;

    if (!sidebar || sidebar.dataset.initialized === "true") {
        if (sidebar) marcarLinkAtivo(sidebar);
        return;
    }

    const abrirSidebar = () => {
        sidebar.classList.add("open");
        if (overlay) overlay.classList.add("active");
    };

    const fecharSidebar = () => {
        sidebar.classList.remove("open");
        if (overlay) overlay.classList.remove("active");
    };

    if (btnMenu) btnMenu.addEventListener("click", abrirSidebar);
    if (btnX) btnX.addEventListener("click", fecharSidebar);
    if (overlay) overlay.addEventListener("click", fecharSidebar);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") fecharSidebar();
    });

    const submenus = sidebar.querySelectorAll(".sidebar-submenu-container");
    submenus.forEach((container) => {
        const btn = container.querySelector(".sidebar-item-expandavel");
        const submenu = container.querySelector(".sidebar-submenu");
        if (btn && submenu) {
            btn.addEventListener("click", () => {
                const expandido = !submenu.classList.contains("active");
                atualizarEstadoCadastro(btn, submenu, expandido);
            });
        }
    });

    sidebar.dataset.initialized = "true";

    marcarLinkAtivo(sidebar);
};

// ===================================================================
// 4. GATILHO DE AUTO-INICIALIZAÇÃO E UTILITÁRIOS
// ===================================================================

window.inicializarFechamentoPopupClickFora = function () {
    document.addEventListener("click", (event) => {
        const popupOverlay = event.target.closest(".popup, .sobreposicao");
        if (!popupOverlay) {
            return;
        }

        const isInsideContent = event.target.closest(".popup-card, .popup-content");
        if (isInsideContent) {
            return;
        }

        popupOverlay.style.display = "none";
    });
};

document.addEventListener("DOMContentLoaded", () => {
    if (typeof window.inicializarComponentes === "function") {
        window.inicializarComponentes();
    }
    if (typeof window.inicializarFechamentoPopupClickFora === "function") {
        window.inicializarFechamentoPopupClickFora();
    }
});