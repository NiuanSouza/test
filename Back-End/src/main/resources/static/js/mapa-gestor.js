/**
 * ===================================================================
 * ARQUIVO: mapa-gestor.js
 * REFERÊNCIA GLOBAL: Requer 'basic.js' e a biblioteca Leaflet (L).
 * RESPONSABILIDADE: Renderizar o mapa interativo do gestor, geocodificar
 * endereços via CEP (ViaCEP/Nominatim) e gerenciar (CRUD) os chamados locais.
 * ===================================================================
 */

// ===================================================================
// 1. ESTADO GLOBAL E CONSTANTES
// ===================================================================
let mapaGestor = null;
let chamadosGestor = [];
let markersGestor = {};
let marcadorSelecaoGestor = null;
let localizacaoSelecionada = null;
let referenciaLocalizacaoSelecionada = { cep: "" };

// Variável de controle para o Modal de Exclusão
let idChamadoParaExcluir = null;

const CENTRO_PADRAO_MAPA = [-23.5567, -46.6457];

// ===================================================================
// 2. INICIALIZAÇÃO DO MAPA
// ===================================================================

window.inicializarMapaGestor = function () {
    const mapaElement = document.getElementById("mapaGestor");

    if (!mapaElement || typeof L === "undefined") {
        console.error("⚠️ [SIVA MAPS] Mapa não disponível ou Leaflet não carregado.");
        return;
    }

    mapaGestor = L.map(mapaElement, {
        center: CENTRO_PADRAO_MAPA,
        zoom: 13,
        scrollWheelZoom: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(mapaGestor);

    // Permite ao gestor clicar no mapa para ajustar ou forçar um ponto de atendimento
    mapaGestor.on("click", (event) => {
        definirLocalizacaoSelecionada(
            event.latlng.lat,
            event.latlng.lng,
            obterCepDigitado(),
            "ajuste-manual"
        );
        window.mostrarToast("Ponto ajustado manualmente no mapa.", "toast-aviso1");
    });

    carregarChamadosDaAPI();
    configurarFormularioChamado();
};

// ===================================================================
// 3. CONFIGURAÇÃO E MANIPULAÇÃO DO FORMULÁRIO
// ===================================================================

function configurarFormularioChamado() {
    const form = document.getElementById("formChamado");
    const btnBuscarCep = document.getElementById("btnBuscarCep");
    const inputCep = document.getElementById("cep");

    if (form) {
        form.addEventListener("submit", criarChamado);
        form.addEventListener("reset", () => {
            window.setTimeout(() => limparLocalizacaoSelecionada(), 0);
        });
    }

    if (btnBuscarCep) {
        btnBuscarCep.addEventListener("click", async () => {
            const localizado = await buscarLocalizacaoPorCep();
            if (!localizado && mapaGestor) {
                mapaGestor.getContainer().scrollIntoView({ behavior: "smooth", block: "center" });
                mapaGestor.invalidateSize();
            }
        });
    }

    if (inputCep) {
        inputCep.addEventListener("input", () => {
            inputCep.value = formatarCep(inputCep.value);
            if (localizacaoSelecionada && obterCepDigitado() !== referenciaLocalizacaoSelecionada.cep) {
                limparLocalizacaoSelecionada(false);
                atualizarResumoLocalizacao("CEP alterado. Busque novamente para posicionar o chamado.");
            }
        });

        // Validação automática ao perder o foco do CEP
        inputCep.addEventListener("blur", () => {
            if (obterCepDigitado().length === 8 && obterCepDigitado() !== referenciaLocalizacaoSelecionada.cep) {
                buscarLocalizacaoPorCep(false);
            }
        });
    }

    atualizarResumoLocalizacao();
}

function formatarCep(valor) {
    const digitos = (valor || "").replace(/\D/g, "").slice(0, 8);
    if (digitos.length <= 5) return digitos;
    return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

function obterCepDigitado() {
    const inputCep = document.getElementById("cep");
    return inputCep ? inputCep.value.replace(/\D/g, "") : "";
}

function obterEnderecoDigitado() {
    const inputEndereco = document.getElementById("endereco");
    return inputEndereco ? inputEndereco.value.trim() : "";
}

// ===================================================================
// 4. SERVIÇOS DE GEOCODIFICAÇÃO E CEP
// ===================================================================

async function buscarLocalizacaoPorCep(exibirToast = true) {
    const cep = obterCepDigitado();
    const botao = document.getElementById("btnBuscarCep");

    if (cep.length !== 8) {
        if (exibirToast) window.mostrarToast("Informe um CEP válido com 8 dígitos.");
        return false;
    }

    if (botao) {
        botao.disabled = true;
        botao.textContent = "Buscando...";
    }

    try {
        const dadosCep = await consultarCep(cep);
        const coordenadas = await geocodificarPorCep(cep, dadosCep);

        definirLocalizacaoSelecionada(coordenadas.latitude, coordenadas.longitude, cep, "cep");

        if (mapaGestor) mapaGestor.setView([coordenadas.latitude, coordenadas.longitude], 16);
        if (exibirToast) window.mostrarToast("CEP localizado com sucesso.", "toast-aviso1");

        return true;
    } catch (error) {
        console.error("Erro ao buscar localização por CEP:", error);
        if (exibirToast) window.mostrarToast("Não foi possível localizar esse CEP.");
        return false;
    } finally {
        if (botao) {
            botao.disabled = false;
            botao.textContent = "Buscar CEP";
        }
    }
}

async function consultarCep(cep) {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!resposta.ok) throw new Error("Falha ao consultar CEP");

    const dados = await resposta.json();
    if (dados.erro) throw new Error("CEP não encontrado");

    const inputEndereco = document.getElementById("endereco");
    if (inputEndereco) {
        const enderecoAtual = inputEndereco.value.trim();
        if (!enderecoAtual) inputEndereco.value = montarEnderecoPadrao(dados);
    }
    return dados;
}

function montarEnderecoPadrao(dadosCep) {
    return [
        dadosCep.logradouro,
        dadosCep.bairro,
        dadosCep.localidade && dadosCep.uf ? `${dadosCep.localidade} - ${dadosCep.uf}` : dadosCep.localidade || dadosCep.uf
    ].filter(Boolean).join(", ");
}

async function geocodificarPorCep(cep, dadosCep) {
    const enderecoDigitado = obterEnderecoDigitado();

    const consultas = [
        `${cep}, Brasil`,
        [dadosCep.logradouro, dadosCep.localidade, dadosCep.uf, "Brasil"].filter(Boolean).join(", "),
        [dadosCep.bairro, dadosCep.localidade, dadosCep.uf, "Brasil"].filter(Boolean).join(", "),
        [enderecoDigitado, dadosCep.localidade, dadosCep.uf, "Brasil"].filter(Boolean).join(", ")
    ].filter((consulta, indice, lista) => consulta && lista.indexOf(consulta) === indice);

    for (const consulta of consultas) {
        const coordenadas = await geocodificarConsulta(consulta);
        if (coordenadas) return coordenadas;
    }
    throw new Error("CEP não localizado no mapa");
}

async function geocodificarConsulta(consulta) {
    const resposta = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(consulta)}`,
        { headers: { Accept: "application/json" } }
    );
    if (!resposta.ok) return null;

    const resultados = await resposta.json();
    if (!Array.isArray(resultados) || resultados.length === 0) return null;

    return { latitude: Number(resultados[0].lat), longitude: Number(resultados[0].lon) };
}

// ===================================================================
// 5. MANIPULAÇÃO DO MARCADOR TEMPORÁRIO (Seleção)
// ===================================================================

function definirLocalizacaoSelecionada(latitude, longitude, cep, origem) {
    localizacaoSelecionada = { latitude: Number(latitude.toFixed(4)), longitude: Number(longitude.toFixed(4)) };
    referenciaLocalizacaoSelecionada = { cep };

    if (!mapaGestor) {
        atualizarResumoLocalizacao();
        return;
    }

    if (!marcadorSelecaoGestor) {
        marcadorSelecaoGestor = L.circleMarker([localizacaoSelecionada.latitude, localizacaoSelecionada.longitude], {
            radius: 9, fillColor: "#002080", color: "#ffffff", weight: 3, opacity: 1, fillOpacity: 0.95
        }).addTo(mapaGestor);
    } else {
        marcadorSelecaoGestor.setLatLng([localizacaoSelecionada.latitude, localizacaoSelecionada.longitude]);
    }

    const mensagemPopup = origem === "cep" ? "Local definido a partir do CEP informado." : "Local ajustado manualmente no mapa.";
    marcadorSelecaoGestor.bindPopup(mensagemPopup).openPopup();
    atualizarResumoLocalizacao();
}

function limparLocalizacaoSelecionada(restaurarMensagem = true) {
    localizacaoSelecionada = null;
    referenciaLocalizacaoSelecionada = { cep: "" };

    if (mapaGestor && marcadorSelecaoGestor) {
        mapaGestor.removeLayer(marcadorSelecaoGestor);
        marcadorSelecaoGestor = null;
    }
    atualizarResumoLocalizacao(restaurarMensagem ? "" : "CEP alterado. Busque novamente para posicionar o chamado.");
}

function atualizarResumoLocalizacao(mensagemCustomizada = "") {
    const resumo = document.getElementById("resumoLocalizacao");
    if (!resumo) return;

    if (localizacaoSelecionada) {
        resumo.classList.add("ativo");
        resumo.textContent = "CEP validado e ponto definido no mapa. Se necessário, ajuste clicando no mapa.";
    } else {
        resumo.classList.remove("ativo");
        resumo.textContent = mensagemCustomizada || "O ponto do chamado será definido com base no CEP informado. O endereço pode ser ajustado manualmente.";
    }
}

// ===================================================================
// 6. OPERAÇÕES DE API E CRUD DOS CHAMADOS
// ===================================================================

async function carregarChamadosDaAPI() {
    try {
        const response = await window.apiFetch("/service/pending", { method: "GET" });
        if (response && response.ok) {
            const dados = await response.json();
            chamadosGestor = dados.map(normalizarChamado);
            finalizarCarregamento();
        } else {
            console.warn("API de chamados falhou. Usando dados locais.");
            carregarChamadosLocal();
        }
    } catch (error) {
        console.error("Erro ao buscar chamados da API:", error);
        carregarChamadosLocal();
    }
}

async function criarChamado(event) {
    event.preventDefault();

    const endereco = obterEnderecoDigitado();
    const cep = obterCepDigitado();
    const tipoServico = document.getElementById("tipoServico")?.value;
    const tipoCNH = document.getElementById("tipoCNH")?.value;
    const tecnico = document.getElementById("tecnicoResponsavel")?.value;
    const observacoes = document.getElementById("observacoes")?.value.trim();

    if (!endereco || cep.length !== 8 || !tipoServico || !tipoCNH || !tecnico) {
        window.mostrarToast("Preencha CEP, endereço e os demais campos obrigatórios.");
        return;
    }

    if (!localizacaoSelecionada || referenciaLocalizacaoSelecionada.cep !== cep) {
        const localizado = await buscarLocalizacaoPorCep(false);
        if (!localizado || !localizacaoSelecionada) {
            window.mostrarToast("Não foi possível validar o local com esse CEP.");
            return;
        }
    }

    const novoChamado = {
        endereco, cep, tipoServico, tipoCNH, tecnicoResponsavel: tecnico,
        observacoes, latitude: localizacaoSelecionada.latitude, longitude: localizacaoSelecionada.longitude,
        status: "pendente"
    };

    try {
        const response = await window.apiFetch("/service/create-pending", {
            method: "POST",
            body: JSON.stringify(novoChamado)
        });

        if (response && response.ok) {
            const dados = await response.json();
            chamadosGestor.push(normalizarChamado(dados));
            finalizarCriacaoChamado();
        } else {
            console.warn("Erro ao salvar na API. Salvando localmente por segurança.");
            chamadosGestor.push(novoChamado);
            finalizarCriacaoChamado();
        }
    } catch (error) {
        console.error("Erro na criação:", error);
        chamadosGestor.push(novoChamado);
        finalizarCriacaoChamado();
    }
}

window.excluirChamado = function (id) {
    idChamadoParaExcluir = id;
    const popupConf = document.getElementById("popupConfirmacaoMapa");

    if (popupConf) {
        popupConf.style.display = "flex";
    } else {
        if (confirm("Tem certeza que deseja excluir este chamado?")) {
            window.executarExclusaoChamado(id);
        }
    }
};

window.executarExclusaoChamado = async function (id) {
    const popupConf = document.getElementById("popupConfirmacaoMapa");
    if (popupConf) popupConf.style.display = "none";

    try {
        const response = await window.apiFetch(`/service/${id}`, { method: "DELETE" });
        removerChamado(id);
        const popupSuc = document.getElementById("popupSucessoMapa");
        if (popupSuc) popupSuc.style.display = "flex";
    } catch (error) {
        console.warn("Erro ao excluir na API. Excluindo localmente.", error);
        removerChamado(id);
        const popupSuc = document.getElementById("popupSucessoMapa");
        if (popupSuc) popupSuc.style.display = "flex";
    } finally {
        idChamadoParaExcluir = null;
    }
};

// --- Funções de Estado e Contingência Local ---
function carregarChamadosLocal() {
    const armazenados = localStorage.getItem("chamadosGestor");
    if (armazenados) {
        chamadosGestor = JSON.parse(armazenados).map(normalizarChamado);
    }
    finalizarCarregamento();
}

function salvarChamadosLocal() {
    localStorage.setItem("chamadosGestor", JSON.stringify(chamadosGestor));
}

function removerChamado(id) {
    chamadosGestor = chamadosGestor.filter((chamado) => chamado.id !== id);
    salvarChamadosLocal();
    finalizarCarregamento();
}

function finalizarCriacaoChamado() {
    salvarChamadosLocal();
    finalizarCarregamento();
    const form = document.getElementById("formChamado");
    if (form) form.reset();
    limparLocalizacaoSelecionada();
    window.mostrarToast("Chamado criado com sucesso!", "toast-aviso1");
}

function finalizarCarregamento() {
    renderizarChamados();
    renderizarMarkersMapa();
}

// ===================================================================
// 7. RENDERIZAÇÃO DA INTERFACE E MAPA (UI)
// ===================================================================

function normalizarChamado(chamado) {
    return {
        id: chamado.id,
        endereco: chamado.endereco || chamado.title || "Endereço não informado",
        cep: chamado.cep || "",
        tipoServico: chamado.tipoServico || chamado.serviceType || "Serviço não informado",
        tipoCNH: chamado.tipoCNH || chamado.cnhType || "Não informado",
        tecnico: chamado.tecnicoResponsavel || chamado.tecnico || "Não atribuído",
        latitude: Number(chamado.latitude ?? chamado.lat),
        longitude: Number(chamado.longitude ?? chamado.lng),
        observacoes: chamado.observacoes || chamado.observacao || "",
        status: chamado.status || "novo",
        dataCriacao: chamado.dataCriacao || chamado.createdAt || new Date().toLocaleString()
    };
}

function possuiCoordenadasValidas(chamado) {
    return Number.isFinite(chamado.latitude) && Number.isFinite(chamado.longitude);
}

function renderizarMarkersMapa() {
    if (!mapaGestor) return;

    Object.values(markersGestor).forEach(marker => mapaGestor.removeLayer(marker));
    markersGestor = {};
    const bounds = [];

    chamadosGestor.forEach((chamado) => {
        if (!possuiCoordenadasValidas(chamado)) return;

        const cor = obterCorPorStatus(chamado.status);
        const marker = L.circleMarker([chamado.latitude, chamado.longitude], {
            radius: 8, fillColor: cor, color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.85
        }).addTo(mapaGestor);

        const popupConteudo = `
            <div class="popup-mapa" style="font-family: sans-serif; font-size: 13px;">
                <strong style="display:block; margin-bottom:2px; color:#1a3c6d;">${chamado.endereco}</strong>
                <small style="color:#555; font-weight:600;">${chamado.tipoServico}</small><br>
                <span style="display:inline-block; margin-top:5px;"><strong>Status:</strong> ${formatarStatus(chamado.status)}</span><br>
                <button onclick="window.abrirDetalhesChamado('${chamado.id}')" class="btn-popup-mapa" style="margin-top:8px; cursor:pointer;">Ver detalhes</button>
            </div>
        `;

        marker.bindPopup(popupConteudo, { maxWidth: 240 });
        markersGestor[chamado.id] = marker;
        bounds.push([chamado.latitude, chamado.longitude]);
    });

    if (bounds.length > 0) {
        mapaGestor.fitBounds(bounds, { padding: [30, 30] });
    } else {
        mapaGestor.setView(CENTRO_PADRAO_MAPA, 13);
    }
}

function renderizarChamados() {
    const container = document.getElementById("listaChamadosGestor");
    if (!container) return;

    if (chamadosGestor.length === 0) {
        container.innerHTML = `<p class="lista-vazia" style="text-align:center; padding:20px;">Nenhum chamado criado ainda.</p>`;
        return;
    }

    container.innerHTML = chamadosGestor.map((chamado) => `
        <div class="item-chamado status-${chamado.status}">
            <div class="item-header">
                <strong>${chamado.endereco}</strong>
                <span class="status-badge status-${chamado.status}">${formatarStatus(chamado.status)}</span>
            </div>
            <div class="item-info">
                <p><small><strong>CEP:</strong> ${chamado.cep || "Não informado"}</small></p>
                <p><small><strong>Serviço:</strong> ${chamado.tipoServico}</small></p>
            </div>
            <div class="item-acoes">
                <button class="btn-detalhe" onclick="window.abrirDetalhesChamado('${chamado.id}')">Detalhes</button>
                <button class="btn-excluir" onclick="window.excluirChamado('${chamado.id}')">Excluir</button>
            </div>
        </div>
    `).join("");
}

// --- UTILITÁRIOS DE TELA E MODAIS ---
function obterCorPorStatus(status) {
    switch (String(status).toLowerCase().trim()) {
        case "novo": return "#FFD700";
        case "pendente": return "#FF9800";
        case "ativo": return "#4CAF50";
        case "concluido": return "#2196F3";
        default: return "#9E9E9E";
    }
}

function formatarStatus(status) {
    if (!status) return "Novo";
    return status.charAt(0).toUpperCase() + status.slice(1);
}

window.abrirDetalhesChamado = function (id) {
    const chamado = chamadosGestor.find((item) => String(item.id) === String(id));
    if (!chamado) return;

    const conteudo = `
        <p><strong>Endereço:</strong> ${chamado.endereco}</p>
        <p><strong>CEP:</strong> ${chamado.cep || "Não informado"}</p>
        <p><strong>Tipo de Serviço:</strong> ${chamado.tipoServico}</p>
        <p><strong>Tipo de CNH (Requisitada):</strong> ${chamado.tipoCNH}</p>
        ${chamado.tecnico && chamado.tecnico !== "Não atribuído" ? `<p><strong>Técnico Responsável:</strong> ${chamado.tecnico}</p>` : ``}
        <p><strong>Observações:</strong> ${chamado.observacoes || "Nenhuma"}</p>
        <p><strong>Status Atual:</strong> ${formatarStatus(chamado.status)}</p>
        <p><strong>Data de Criação:</strong> ${chamado.dataCriacao}</p>
    `;

    document.getElementById("modalTitulo").textContent = `Chamado - ${chamado.endereco}`;
    document.getElementById("modalConteudo").innerHTML = conteudo;
    document.getElementById("modalDetalheChamado").style.display = "flex";
};

window.fecharModalDetalhes = function () {
    const modal = document.getElementById("modalDetalheChamado");
    if (modal) modal.style.display = "none";
};

// ===================================================================
// 8. GATILHO DE INICIALIZAÇÃO E EVENTOS DE MODAL
// ===================================================================

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("mapaGestor")) {
        window.inicializarMapaGestor();
    }

    // --- CONEXÃO DOS BOTÕES DO MODAL DE EXCLUSÃO ---
    const btnConfirmar = document.getElementById("btn-confirmar-final-mapa");
    const btnCancelar = document.getElementById("btn-cancelar-confirmacao-mapa");
    const btnFecharSucesso = document.getElementById("btn-fechar-sucesso-mapa");

    if (btnConfirmar) {
        btnConfirmar.addEventListener("click", () => {
            if (idChamadoParaExcluir !== null) {
                window.executarExclusaoChamado(idChamadoParaExcluir);
            }
        });
    }

    if (btnCancelar) {
        btnCancelar.addEventListener("click", () => {
            idChamadoParaExcluir = null;
            document.getElementById("popupConfirmacaoMapa").style.display = "none";
        });
    }

    if (btnFecharSucesso) {
        btnFecharSucesso.addEventListener("click", () => {
            document.getElementById("popupSucessoMapa").style.display = "none";
            window.location.reload();
        });
    }
});