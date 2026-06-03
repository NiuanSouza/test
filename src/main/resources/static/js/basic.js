/**
 * ===================================================================
 * ARQUIVO: basic.js
 * RESPONSABILIDADE: Núcleo do Sistema (SIVA).
 * Fornece a fundação global para Autenticação, Comunicação Segura com
 * a API (Interceptors), injeção de Layouts estáticos e Feedbacks de UI.
 * ===================================================================
 */

// ===================================================================
// 1. CONFIGURAÇÕES, SEGURANÇA E SESSÃO
// ===================================================================

const CONFIG = Object.freeze({
    // Configurações de Ambiente
    API_URL: window.location.origin,

    TOKEN_KEY: "auth_token",

    // MODO DESENVOLVEDOR
    DEV_MODE: false,

    checkAuth: function () {
        if (this.DEV_MODE) {
            console.warn("⚠️ [DEV MODE] Redirecionamentos de segurança desativados.");
            return localStorage.getItem(this.TOKEN_KEY);
        }

        const token = localStorage.getItem(this.TOKEN_KEY);
        const path = window.location.pathname;
        const isLoginPage = path.endsWith("index.html") || path === "/" || path === "";

        if (!token || this.isTokenExpired(token)) {
            this.handleLogout(isLoginPage);
            return null;
        }

        if (isLoginPage) {
            this.redirectByPermission();
        }

        return token;
    },

    isTokenExpired: function (token) {
        try {
            const payload = this.decodeToken(token);
            if (!payload || !payload.exp) return true;

            const expirationTime = (payload.exp * 1000) - 10000;
            return Date.now() >= expirationTime;
        } catch (e) {
            return true;
        }
    },

    decodeToken: function (token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;

            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
            );

            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error("Erro ao decodificar token JWT:", e);
            return null;
        }
    },

    redirectByPermission: function () {
        const rawPermission = localStorage.getItem("userPermission") || "";
        const permission = rawPermission.trim().toUpperCase().replace("ROLE_", "");
        const destination = (permission === "ADMINISTRATOR" || permission === "MANAGER") ? "telainicial-gestor.html" : "telainicial.html";

        window.location.replace(destination);
    },

    handleLogout: function (isLoginPage = false) {
        localStorage.clear();
        if (!isLoginPage && !this.DEV_MODE) {
            window.location.href = "index.html";
        }
    },

    injectGlobalStyles: function() {
        if (document.getElementById("basic-global-styles")) return;

        const style = document.createElement("style");
        style.id = "basic-global-styles";
        style.innerHTML = `
            .error-container-global { background-color: #ffebee; border: 1px solid #f44336; color: #b71c1c; padding: 20px; border-radius: 8px; margin: 20px auto; text-align: left; width: 95%; max-width: 1200px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); animation: basicFadeIn 0.3s ease-out; }
            .error-details { font-size: 12px; background: #fff; padding: 10px; border: 1px solid #ffcdd2; color: #333; font-family: monospace; overflow-x: auto; margin-top: 10px; }
            @keyframes basicFadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            .toast-hidden, .toast-hidden1 { opacity: 0 !important; transition: opacity 0.5s ease; pointer-events: none; }
            
            /* Correções Globais para Modais e Popups */
            .sobreposicao, .popup { z-index: 1500 !important; padding: 15px; box-sizing: border-box; align-items: center; justify-content: center; overflow-y: auto !important; }
            .popup-card, .popup-content { max-height: 90vh !important; overflow-y: auto !important; margin: auto; display: flex; flex-direction: column; width: min(95%, 600px) !important; }
            .popup-card::-webkit-scrollbar, .popup-content::-webkit-scrollbar { width: 6px; }
            .popup-card::-webkit-scrollbar-thumb, .popup-content::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
            .popup-card::-webkit-scrollbar-track, .popup-content::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        `;
        document.head.appendChild(style);
    }
});

// ===================================================================
// 2. INJEÇÃO DE COMPONENTES DE LAYOUT (DINÂMICO PELO LOGIN)
// ===================================================================

/**
 * Injeta automaticamente o Layout (Topbar e Sidebar) nas páginas
 * Define a sidebar automaticamente baseada na permissão do localStorage
 * @param {string} titulo - Título que aparecerá na TopBar
 */
window.injetarLayout = function(titulo) {
    const topbar = document.getElementById("topbar-container");
    const sidebar = document.getElementById("sidebar-container");

    // Lógica dinâmica: Puxa do localStorage na hora de montar a tela
    const rawPermission = localStorage.getItem("userPermission") || "";
    const permission = rawPermission.trim().toUpperCase().replace("ROLE_", "");

    // Se for Administrador ou Gestor, injeta o menu de Gestor. Se não, menu de Técnico.
    const tipoSidebar = (permission === "ADMINISTRATOR" || permission === "MANAGER") ? 'gestor' : 'tecnico';

    if (topbar && typeof window.renderizarTopBar === 'function') {
        topbar.insertAdjacentHTML("beforeend", window.renderizarTopBar(titulo));
    }

    if (sidebar && typeof window.renderizarSidebarGestor === 'function' && typeof window.renderizarSidebarTecnico === 'function') {
        const menuHTML = (tipoSidebar === 'gestor') ? window.renderizarSidebarGestor() : window.renderizarSidebarTecnico();
        sidebar.insertAdjacentHTML("beforeend", menuHTML);
    }

    // Inicializa os eventos da sidebar e menus
    if (typeof window.inicializarComponentes === 'function') {
        window.inicializarComponentes();
    }
};

// ===================================================================
// 3. FETCH WRAPPER GLOBAL
// ===================================================================

window.apiFetch = async function (endpoint, options = {}) {
    const token = localStorage.getItem(CONFIG.TOKEN_KEY);
    const headers = { ...options.headers };

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    } else {
        delete headers['Content-Type'];
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${CONFIG.API_URL}${endpoint}`, { ...options, headers });

        if ([401, 403].includes(response.status)) {
            console.warn(`Sessão inválida ou sem permissão (${response.status}). Redirecionando...`);
            CONFIG.handleLogout(window.location.pathname.endsWith("index.html"));
            return null;
        }

        return response;
    } catch (error) {
        console.error("Erro Crítico de Conexão na API:", error);
        throw error;
    }
};

// ===================================================================
// 4. SISTEMA DE TOAST E FEEDBACK VISUAL
// ===================================================================

let toastTimeout;

window.mostrarToast = function (mensagem, toastId = "toast-aviso") {
    const toast = document.getElementById(toastId);
    if (!toast) {
        alert(mensagem);
        return;
    }

    clearTimeout(toastTimeout);

    const classOculta = toastId === "toast-aviso1" ? "toast-hidden1" : "toast-hidden";
    toast.innerText = mensagem;
    toast.style.display = "block";
    toast.classList.remove(classOculta);

    void toast.offsetWidth;

    toastTimeout = setTimeout(() => {
        toast.classList.add(classOculta);
        setTimeout(() => {
            if (toast.classList.contains(classOculta)) toast.style.display = "none";
        }, 500);
    }, 3000);
};

window.exibirErro = function (mensagem, detalhes = "", seletor = ".dashboard-grid, .main-content, #app") {
    const htmlErro = `
        <div class="error-container-global">
            <h3 style="margin-top:0; display:flex; align-items:center; gap:8px;">⚠️ Falha na Operação</h3>
            <p style="margin-bottom:0;"><strong>Causa:</strong> ${mensagem}</p>
            ${detalhes ? `<div class="error-details">${detalhes}</div>` : ""}
        </div>
    `;

    const container = document.querySelector(seletor);
    if (container) {
        container.innerHTML = htmlErro;
        if (window.getComputedStyle(container).display === "grid") {
            container.style.display = "block";
        }
    } else {
        document.body.insertAdjacentHTML('afterbegin', htmlErro);
    }
    window.mostrarToast(mensagem);
};

// ===================================================================
// 5. SISTEMA DE EXPORTAÇÃO GLOBAL
// ===================================================================

window.baixarArquivo = async function (formato, recurso, parametros = {}, nomeArquivo) {
    const formatoLimpo = formato.toLowerCase();
    const caminhoBase = `/export/${formatoLimpo}/${recurso}/${nomeArquivo}`;
    const queryParams = new URLSearchParams(parametros).toString();
    const urlFinal = queryParams ? `${caminhoBase}?${queryParams}` : caminhoBase;

    const response = await window.apiFetch(urlFinal, { method: "GET" });

    if (!response) return;

    if (!response.ok) {
        throw new Error(`Erro do servidor: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;

    const extensao = formatoLimpo === 'excel' ? 'xlsx' : formatoLimpo;
    const nomeFinal = nomeArquivo.toLowerCase().endsWith(`.${extensao}`) ? nomeArquivo : `${nomeArquivo}.${extensao}`;
    a.download = nomeFinal;

    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

// ===================================================================
// 6. ROTINA DE INICIALIZAÇÃO
// ===================================================================

(function init() {
    CONFIG.injectGlobalStyles();
    CONFIG.checkAuth();
    window.btnlogout = () => CONFIG.handleLogout(false);
    
    // Adiciona listener global para fechar modais ao clicar na área externa (backdrop)
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('sobreposicao') || e.target.classList.contains('popup')) {
            e.target.style.display = 'none';
        }
    });
})();