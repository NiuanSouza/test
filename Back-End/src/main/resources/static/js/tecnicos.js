/**
 * ===================================================================
 * ARQUIVO: tecnicos.js
 * REFERÊNCIA GLOBAL: Requer 'basic.js' (Utiliza apiFetch e mostrarToast)
 * RESPONSABILIDADE: Listagem, filtro, exibição e edição dos dados
 * dos Técnicos na tela de gestão.
 * ===================================================================
 */

// ===================================================================
// 1. ESTADO GLOBAL E DICIONÁRIOS
// ===================================================================
let tecnicosAtuais = [];
let tecnicoEditandoMatricula = null; // O backend usa a matrícula (registration) como ID principal

// Dicionário de conversão para manter o Front em PT-BR e o Backend em EN-US (Enums)
const TRANSLATION = {
    STATUS_TO_PT: {
        "AVAILABLE": "Ativo",
        "ON_DUTY": "Em Serviço",
        "DISMISSED": "Inativo"
    },
    STATUS_TO_EN: {
        "Ativo": "AVAILABLE",
        "Inativo": "DISMISSED",
        "Suspenso": "DISMISSED",
        "Em Serviço": "ON_DUTY"
    },
    PERFIL: {
        "TECHNICIAN": "Técnico",
        "ADMINISTRATOR": "Gestor"
    }
};

// ===================================================================
// 2. BUSCA E RENDERIZAÇÃO DA API
// ===================================================================

/**
 * Função: buscarTecnicosDaAPI
 * O que faz: Bate no backend para listar todos os usuários com perfil de técnico.
 * Faz a sanitização e mapeamento dos dados recebidos antes de renderizar.
 * Requisição: GET /user/technicians
 */
async function buscarTecnicosDaAPI() {
    const corpoTabela = document.getElementById("tecnicosTabelaCorpo");
    if (corpoTabela) {
        corpoTabela.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">Carregando técnicos...</td></tr>`;
    }

    try {
        // Usa o apiFetch centralizado que injeta o Bearer Token
        const response = await window.apiFetch("/user/technicians", { method: "GET" });
        if (!response) return; // Sessão inválida/expirada interceptada pelo basic.js

        if (response.ok) {
            const data = await response.json();

            // Prepara os dados brutos da API para o formato esperado pela Tabela
            tecnicosAtuais = data.map(u => ({
                registration: u.registration,
                name: u.name,
                email: u.email,
                phone: u.phone || "Não informado",
                setor: u.setor || "Operacional", // Caso o backend não envie, assume padrão
                perfil: u.permission || "TECHNICIAN",
                status: u.employeeStatus || "AVAILABLE"
            }));

            renderizarTecnicos(tecnicosAtuais);
        } else {
            const errorMsg = await response.text();
            console.error("Erro na busca de técnicos:", errorMsg);
            if (corpoTabela) corpoTabela.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Erro ao carregar técnicos.</td></tr>`;
        }
    } catch (error) {
        console.error("Erro de conexão ao carregar técnicos:", error);
        window.mostrarToast("Falha de comunicação com o servidor.");
        if (corpoTabela) corpoTabela.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Sem conexão com o servidor.</td></tr>`;
    }
}

/**
 * Função: renderizarTecnicos
 * O que faz: Constrói dinamicamente as linhas (<tr>) da tabela de técnicos
 * aplicando traduções e classes CSS corretas baseadas no status.
 */
function renderizarTecnicos(lista) {
    const corpo = document.getElementById("tecnicosTabelaCorpo");
    if (!corpo) return;

    if (!lista || lista.length === 0) {
        corpo.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 32px 0; color: #4a5c7f;">Nenhum técnico encontrado.</td></tr>`;
        return;
    }

    corpo.innerHTML = lista.map(tecnico => {
        // Traduz as constantes em inglês do banco de dados para a interface
        const statusPT = TRANSLATION.STATUS_TO_PT[tecnico.status] || "Ativo";
        const perfilPT = TRANSLATION.PERFIL[tecnico.perfil] || "Técnico";

        return `
            <tr>
                <td>${tecnico.name}</td>
                <td>${tecnico.registration}</td>
                <td>${tecnico.email}</td>
                <td>${tecnico.setor}</td>
                <td>${perfilPT}</td>
                <td><span class="status-badge status-${tecnico.status}">${statusPT}</span></td>
                <td>
                    <button class="btn-tecnico-editar" type="button" onclick="abrirEditarTecnico('${tecnico.registration}')">
                        Editar
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

// ===================================================================
// 3. EDIÇÃO DE TÉCNICOS (UI e Integração)
// ===================================================================

/**
 * Função: abrirEditarTecnico
 * O que faz: Localiza o técnico na memória, preenche os inputs do formulário
 * flutuante (modal) e o exibe na tela.
 */
window.abrirEditarTecnico = function (matricula) {
    tecnicoEditandoMatricula = matricula; // Salva a matrícula alvo para a rota de edição
    const tecnico = tecnicosAtuais.find(t => t.registration === matricula);
    if (!tecnico) return;

    // Função local para injetar dados apenas se o input existir no HTML
    const preencherCampo = (id, valor) => {
        const el = document.getElementById(id);
        if (el) el.value = valor;
    };

    preencherCampo("editarNome", tecnico.name);
    preencherCampo("editarEmail", tecnico.email);
    preencherCampo("editarMatricula", tecnico.registration);
    preencherCampo("editarTelefone", tecnico.phone !== "Não informado" ? tecnico.phone : "");
    preencherCampo("editarSetor", tecnico.setor);
    preencherCampo("editarPerfil", TRANSLATION.PERFIL[tecnico.perfil] || "Técnico");
    preencherCampo("editarStatus", TRANSLATION.STATUS_TO_PT[tecnico.status] || "Ativo");

    const popup = document.getElementById("popupEditarTecnico");
    if (popup) popup.style.display = "flex";
};

window.fecharPopupEditarTecnico = function () {
    const popup = document.getElementById("popupEditarTecnico");
    if (popup) popup.style.display = "none";
    tecnicoEditandoMatricula = null; // Limpa a referência de segurança
};

/**
 * Função: salvarAlteracoesTecnico
 * O que faz: Extrai as informações alteradas do modal, converte os status
 * visuais para os Enums do backend e envia o objeto de atualização (PATCH).
 * Requisição: PATCH /user/update/{registration}
 */
window.salvarAlteracoesTecnico = async function () {
    const nome = document.getElementById("editarNome")?.value.trim();
    const email = document.getElementById("editarEmail")?.value.trim();
    const statusSelecionadoUI = document.getElementById("editarStatus")?.value;

    if (!nome || !email) {
        window.mostrarToast("Nome e E-mail são campos obrigatórios.");
        return;
    }

    // Monta o payload. O backend recebe um Map (dados parciais), então enviamos apenas o necessário
    const payload = {
        name: nome,
        email: email,
        phone: document.getElementById("editarTelefone")?.value.trim() || null,
        employeeStatus: TRANSLATION.STATUS_TO_EN[statusSelecionadoUI] || "AVAILABLE"
    };

    try {
        const response = await window.apiFetch(`/user/update/${tecnicoEditandoMatricula}`, {
            method: "PATCH",
            body: JSON.stringify(payload)
        });

        if (response && response.ok) {
            window.mostrarToast("Técnico atualizado com sucesso!", "toast-aviso1");
            window.fecharPopupEditarTecnico();
            buscarTecnicosDaAPI(); // Atualiza a tabela na interface imediatamente
        } else if (response) {
            // Tratamento de falha segura, extraindo mensagem enviada pelo Controller Java
            const errorData = await response.json().catch(() => ({}));
            const mensagem = errorData.error || errorData.message || "Verifique os dados informados.";
            window.mostrarToast("Erro ao salvar: " + mensagem);
        }
    } catch (error) {
        console.error("Erro na requisição de atualização:", error);
        window.mostrarToast("Erro de conexão com o servidor.");
    }
};

// ===================================================================
// 4. SISTEMA DE FILTROS LOCAIS (Search Bar)
// ===================================================================

/**
 * Funções de Filtro (Busca Rápida)
 * O que fazem: Vasculham a lista carregada em memória (sem bater na API novamente)
 * cruzando o texto digitado com nome, matrícula, email ou setor.
 */
window.aplicarFiltroTecnicos = function () {
    const termo = document.getElementById("filtroBuscaTecnico")?.value.trim().toLowerCase() || "";

    if (!termo) {
        renderizarTecnicos(tecnicosAtuais);
        return;
    }

    const filtrados = tecnicosAtuais.filter(t => {
        // Valida se o termo procurado existe em qualquer um desses campos
        return [t.name, t.registration, t.email, t.setor, t.perfil, t.status].some(campo =>
            (campo || "").toLowerCase().includes(termo)
        );
    });

    renderizarTecnicos(filtrados);
};

window.limparFiltroTecnicos = function () {
    const campo = document.getElementById("filtroBuscaTecnico");
    if (campo) campo.value = "";
    renderizarTecnicos(tecnicosAtuais); // Restaura a tabela completa
};

window.exportarTecnicosCSV = function () {
    if (!tecnicosAtuais || tecnicosAtuais.length === 0) {
        window.mostrarToast("Nenhum técnico disponível para exportar.", "toast-aviso");
        return;
    }

    const headers = ["Nome", "Matrícula", "E-mail", "Telefone", "Setor", "Perfil", "Status"];
    const csvRows = [headers.join(",")];

    tecnicosAtuais.forEach(tecnico => {
        const row = [
            tecnico.name,
            tecnico.registration,
            tecnico.email,
            tecnico.phone,
            tecnico.setor,
            TRANSLATION.PERFIL[tecnico.perfil] || "Técnico",
            TRANSLATION.STATUS_TO_PT[tecnico.status] || "Ativo"
        ];
        csvRows.push(row.map(value => `"${String(value || "").replace(/"/g, '""')}"`).join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tecnicos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    window.mostrarToast("Exportação iniciada.", "toast-aviso1");
};

// ===================================================================
// 5. INICIALIZAÇÃO
// ===================================================================

document.addEventListener("DOMContentLoaded", () => {
    // Valida se a página atual contém a tabela antes de disparar a busca na API
    if (document.getElementById("tecnicosTabelaCorpo")) {
        buscarTecnicosDaAPI();

        // Adiciona evento de tecla "Enter" no campo de busca para melhorar usabilidade
        const campoBusca = document.getElementById("filtroBuscaTecnico");
        if (campoBusca) {
            campoBusca.addEventListener("keyup", (e) => {
                if (e.key === "Enter") window.aplicarFiltroTecnicos();
            });
        }
    }
});