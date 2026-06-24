/**
 * ===================================================================
 * ARQUIVO: service.js
 * REFERÊNCIA GLOBAL: Requer 'basic.js' (Utiliza apiFetch e mostrarToast)
 * RESPONSABILIDADE: Gerenciar o ciclo de vida operacional da frota
 * (Check-in, Check-out, Abastecimento) e controlar as transições de
 * interface durante um chamado ativo.
 * ===================================================================
 */

// ===================================================================
// 1. CHECK-IN (INÍCIO DE SERVIÇO)
// ===================================================================

/**
 * Função: salvarVeiculoInfo
 * O que faz: Captura as informações de partida (Viatura, Usuário e KM inicial),
 * envia para a API para iniciar um novo registro de serviço (chamado).
 * Em caso de sucesso, armazena o ID do serviço localmente para uso futuro.
 * Requisição: POST /service/start
 */
window.salvarVeiculoInfo = async function () {
    const kmInput = document.getElementById("quilometragem-inicial")?.value;
    const obsInput = document.getElementById("observacoes")?.value || "";
    const matricula = localStorage.getItem("userRegistration");

    // Obtém o veículo previamente selecionado na interface
    const vehicleData = localStorage.getItem('selectedVehicle');
    const vehicle = vehicleData ? JSON.parse(vehicleData) : null;

    // Validações de segurança antes de disparar a requisição
    if (!vehicle || !matricula) {
        window.mostrarToast("Erro: Matrícula do usuário ou veículo não encontrados.");
        return;
    }

    if (!kmInput) {
        window.mostrarToast("Por favor, preencha a quilometragem inicial.");
        return;
    }

    try {
        // Envia os dados para a API via wrapper global
        const response = await window.apiFetch("/service/start", {
            method: "POST",
            body: JSON.stringify({
                serviceId: localStorage.getItem("chamadoPendenteId") ? parseInt(localStorage.getItem("chamadoPendenteId")) : null,
                carPrefix: vehicle.prefix.trim(),
                userRegistration: matricula,
                recordKm: parseFloat(kmInput),
                note: obsInput,
                destinationRequester: "Não informado", // Requisito do DTO do Backend
                priority: "MEDIUM"                     // Requisito do DTO do Backend
            })
        });

        if (response && response.ok) {
            const data = await response.json();

            // Salva o ID do serviço gerado pelo Backend (necessário para o check-out/abastecimento)
            const idServico = data.serviceId || data.id;
            localStorage.setItem("activeServiceId", idServico);

            if (localStorage.getItem("chamadoPendenteId")) {
                const endPend = localStorage.getItem("chamadoPendenteEndereco");
                if (endPend) localStorage.setItem("chamadoAtivoEndereco", endPend);
            } else {
                localStorage.removeItem("chamadoAtivoEndereco");
            }

            localStorage.removeItem("chamadoPendenteId");
            localStorage.removeItem("chamadoPendenteEndereco");

            // Guarda o KM inicial para validação contra fraudes/erros no momento do Check-out
            localStorage.setItem("km", kmInput);
            localStorage.setItem("obs", obsInput);

            window.mostrarToast("Check-in confirmado no sistema!", "toast-aviso1");

            // Aciona a transição visual da tela para "Em Serviço" caso a função exista
            if (typeof transicaoPosCheckin === "function") transicaoPosCheckin();

        } else if (response) {
            const erro = await response.json();
            window.mostrarToast("Erro: " + (erro.error || "Falha ao realizar check-in no banco."));
        }
    } catch (error) {
        console.error("Erro na API de Check-in:", error);
        window.mostrarToast("Falha de conexão com o servidor.");
    }
};


// ===================================================================
// 2. CHECK-OUT (ENCERRAMENTO DE SERVIÇO)
// ===================================================================

/**
 * Função: checkoutChamado
 * O que faz: Finaliza o serviço ativo enviando a KM de chegada. Possui
 * validação rigorosa para impedir que a KM final seja menor que a inicial.
 * Requisição: POST /service/finalize/{serviceId}
 */
window.checkoutChamado = async () => {
    const serviceId = localStorage.getItem("activeServiceId");
    const kmInicialSalvo = parseFloat(localStorage.getItem("km")) || 0;

    // Fallback: Busca o valor final no ID específico ou reaproveita o ID inicial dependendo de como o HTML mockado foi estruturado
    const inputFinal = document.getElementById("quilometragem-final")?.value || document.getElementById("quilometragem-inicial")?.value;

    if (!serviceId) {
        window.mostrarToast("Nenhum serviço ativo encontrado para fazer check-out.");
        return;
    }

    if (!inputFinal || inputFinal.trim() === "") {
        window.mostrarToast("Por favor, insira a quilometragem final de chegada.");
        return;
    }

    const kmFinalValue = parseFloat(inputFinal);

    // Impede Check-out inconsistente
    if (kmFinalValue < kmInicialSalvo) {
        window.mostrarToast(`Erro: A KM Final (${kmFinalValue}) não pode ser menor que a Inicial (${kmInicialSalvo}).`);
        return;
    }

    try {
        const response = await window.apiFetch(`/service/finalize/${serviceId}`, {
            method: "POST",
            body: JSON.stringify({ recordKm: kmFinalValue })
        });

        if (response && response.ok) {
            // Limpeza completa da sessão de trabalho do veículo
            localStorage.removeItem("selectedVehicle");
            localStorage.removeItem("km");
            localStorage.removeItem("obs");
            localStorage.removeItem("activeServiceId");
            localStorage.removeItem("chamadoAtivoEndereco");

            // Aciona o novo modal de sucesso da interface mockada
            const modalNovo = document.getElementById("modalAvisoCheckout");
            if (modalNovo) {
                modalNovo.style.display = "flex";
            } else {
                // Fallback para caso a tela antiga ainda esteja sendo usada
                window.mostrarToast("Check-out realizado com sucesso!", "toast-aviso1");
                setTimeout(() => window.location.reload(), 2000);
            }
        } else if (response) {
            const erro = await response.json();
            window.mostrarToast("Erro: " + (erro.error || "Erro ao fazer o check-out no servidor."));
        }
    } catch (error) {
        console.error("Erro na API de Checkout:", error);
        window.mostrarToast("Falha de conexão com o servidor.");
    }
};

/**
 * Função: finalizarCheckout
 * O que faz: Conectada ao botão de fechamento do Modal de Checkout da nova
 * interface mockada. Apenas recarrega a página para resetar o layout.
 */
window.finalizarCheckout = () => {
    window.location.reload();
};


// ===================================================================
// 3. ABASTECIMENTO (DURANTE O SERVIÇO)
// ===================================================================

window.abrirPopupAbastecimento = function() {
    const popup = document.getElementById('popupAbastecimento');
    if (popup) {
        popup.style.display = 'flex';
        // Limpa os campos sempre que abrir o modal
        const inputs = ['litros-abastecimento', 'preco-litro', 'data-abastecimento', 'hora-abastecimento', 'km-veiculo'];
        inputs.forEach(id => {
            if(document.getElementById(id)) document.getElementById(id).value = '';
        });
    }
};

window.fecharPopupAbastecimento = function() {
    const popup = document.getElementById('popupAbastecimento');
    if (popup) popup.style.display = 'none';
};

window.registrarAbastecimento = async function () {
    const serviceId = localStorage.getItem("activeServiceId");
    const litros = document.getElementById("litros-abastecimento")?.value;
    const preco = document.getElementById("preco-litro")?.value;
    const data = document.getElementById("data-abastecimento")?.value;
    const hora = document.getElementById("hora-abastecimento")?.value;
    const kmAbastecimento = document.getElementById("km-veiculo")?.value;

    if (!serviceId) {
        window.mostrarToast("Nenhum serviço ativo. Faça o check-in primeiro.");
        return;
    }

    if (!litros || !preco || !data || !hora || !kmAbastecimento) {
        window.mostrarToast("Preencha Litros, Preço, Data, Horário e a KM atual.");
        return;
    }

    const litrosNum = parseFloat(litros.replace(',', '.'));
    const precoNum = parseFloat(preco.replace(',', '.'));
    const kmNum = parseFloat(kmAbastecimento.replace(',', '.'));
    const valorTotal = (litrosNum * precoNum).toFixed(2);
    const dataHoraIso = `${data}T${hora}:00`;

    // Desabilita o botão de salvar enquanto carrega para evitar duplo clique
    const btnSalvar = document.getElementById("btn-salvar-abastecimento");
    if(btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.textContent = "Salvando...";
    }

    try {
        const response = await window.apiFetch(`/service/${serviceId}/fuel`, {
            method: 'POST',
            body: JSON.stringify({
                liters: litrosNum,
                pricePerLiter: precoNum,
                totalAmount: parseFloat(valorTotal),
                recordKm: kmNum,
                date: dataHoraIso,
                invoice: document.getElementById("nf-abastecimento")?.value || null,
                gasStationName: null,
                fuelType: null
            })
        });

        if (response && response.ok) {
            window.fecharPopupAbastecimento();
            const popupConfirmacaoAbs = document.getElementById('popupConfirmacaoAbs');
            if (popupConfirmacaoAbs) popupConfirmacaoAbs.style.display = 'none';
            
            const popupSucessoAbs = document.getElementById('popupSucessoAbs');
            if (popupSucessoAbs) popupSucessoAbs.style.display = 'flex';
        } else if (response) {
            const erro = await response.json();
            window.mostrarToast("Erro ao abastecer: " + (erro.error || "Falha na operação"));
        }
    } catch (error) {
        console.error("Erro na requisição de abastecimento:", error);
        window.mostrarToast("Falha ao conectar com o servidor.");
    } finally {
        // Reabilita o botão de salvar
        if(btnSalvar) {
            btnSalvar.disabled = false;
            btnSalvar.textContent = "Salvar";
        }
    }
};

window.fecharPopupSucessoAbastecimento = function() {
    // Essa função pode fechar o popup de sucesso original do sistema
    const popupSucessoAbs = document.getElementById('popupSucessoAbs');
    if (popupSucessoAbs) popupSucessoAbs.style.display = 'none';
};


// ===================================================================
// 4. CANCELAMENTO DE CHECK-IN E CHAMADOS
// ===================================================================

window.abrirPopupCancelamento = function() {
    const popup = document.getElementById('popupcancheckin');
    if (popup) {
        popup.style.display = 'flex';
    } else {
        console.error("Erro: Elemento 'popupcancheckin' não encontrado no HTML.");
    }
};

window.fecharPopupCancelamento = function() {
    const popup = document.getElementById('popupcancheckin');
    if (popup) popup.style.display = 'none';
};

window.confirmarCancelamentoCheckin = async function() {
    const motivo = document.getElementById('cancelamentocheckin')?.value;

    if (!motivo || motivo.trim() === "") {
        window.mostrarToast("Por favor, digite o motivo do cancelamento.");
        return;
    }

    const serviceId = localStorage.getItem("activeServiceId");

    if (serviceId && serviceId !== "null" && serviceId !== "undefined") {
        // Envia o cancelamento para o backend (registra ocorrência + encerra serviço)
        try {
            const response = await window.apiFetch(`/service/${serviceId}/cancel`, {
                method: "POST",
                body: JSON.stringify({ description: motivo.trim() })
            });

            if (response && !response.ok) {
                const erro = await response.json().catch(() => ({}));
                console.warn("Erro ao cancelar no servidor:", erro);
            }
        } catch (error) {
            console.warn("Falha ao conectar com o servidor para cancelamento:", error);
        }
    }

    // Fecha o popup de pergunta
    window.fecharPopupCancelamento();

    // Abre o popup de sucesso
    const popupSucesso = document.getElementById('popupSucessoCancelamento');
    if (popupSucesso) popupSucesso.style.display = 'flex';
};

window.fecharPopupSucessoCancelamento = function() {
    const popupSucesso = document.getElementById('popupSucessoCancelamento');
    if (popupSucesso) {
        popupSucesso.style.display = 'none';
    }

    // Limpeza radical do estado local para destravar o sistema
    localStorage.removeItem("selectedVehicle");
    localStorage.removeItem("km");
    localStorage.removeItem("obs");
    localStorage.removeItem("activeServiceId");
    localStorage.removeItem("chamadoPendenteId");

    // Força a página a recarregar limpa
    window.location.reload();
};


// ===================================================================
// 5. REGISTRO DE OCORRÊNCIA / DEFEITO (DURANTE O SERVIÇO)
// ===================================================================

window.abrirPopupOcorrencia = function() {
    const popup = document.getElementById('popupOcorrencia');
    if (popup) {
        popup.style.display = 'flex';
    } else {
        console.error("Erro: Elemento 'popupOcorrencia' não encontrado no HTML.");
    }
};

window.fecharPopupOcorrencia = function() {
    const popup = document.getElementById('popupOcorrencia');
    if (popup) popup.style.display = 'none';
};

window.registrarOcorrencia = async function() {
    const descricao = document.getElementById('descricao-ocorrencia')?.value;
    const gravidade = document.getElementById('gravidade-ocorrencia')?.value || 'MEDIUM';
    const pedirSuporte = document.getElementById('suporte-ocorrencia')?.checked || false;

    if (!descricao || descricao.trim() === "") {
        window.mostrarToast("Por favor, descreva a ocorrência.");
        return;
    }

    const serviceId = localStorage.getItem("activeServiceId");
    if (!serviceId || serviceId === "null") {
        window.mostrarToast("Nenhum serviço ativo para registrar ocorrência.");
        return;
    }

    try {
        const response = await window.apiFetch(`/service/${serviceId}/incident`, {
            method: "POST",
            body: JSON.stringify({
                description: descricao.trim(),
                incidentType: "DEFECT",
                severity: gravidade,
                requestSupport: pedirSuporte
            })
        });

        if (response && response.ok) {
            window.fecharPopupOcorrencia();

            // Limpa o formulário
            const descEl = document.getElementById('descricao-ocorrencia');
            if (descEl) descEl.value = '';
            const supEl = document.getElementById('suporte-ocorrencia');
            if (supEl) supEl.checked = false;

            const popupSucessoOcorrencia = document.getElementById('popupSucessoOcorrencia');
            if (popupSucessoOcorrencia) {
                popupSucessoOcorrencia.style.display = 'flex';
            } else {
                window.mostrarToast("Ocorrência registrada com sucesso!", "toast-aviso1");
            }
        } else if (response) {
            const erro = await response.json().catch(() => ({}));
            window.mostrarToast("Erro: " + (erro.error || "Falha ao registrar ocorrência."));
        }
    } catch (error) {
        console.error("Erro ao registrar ocorrência:", error);
        window.mostrarToast("Falha de conexão com o servidor.");
    }
};

window.fecharPopupSucessoOcorrencia = function() {
    const popupSucesso = document.getElementById('popupSucessoOcorrencia');
    if (popupSucesso) popupSucesso.style.display = 'none';
};

window.carregarChamadosDisponiveis = async function() {
    const container = document.getElementById("lista-chamados-container");
    if (!container) return;

    const quadroDireito = container.closest(".quadro-direito");

    try {
        const response = await window.apiFetch("/service/pending", {
            method: "GET"
        });

        if (response && response.ok) {
            const chamados = await response.json();

            const activeServiceId = localStorage.getItem("activeServiceId");
            const chamadoPendenteId = localStorage.getItem("chamadoPendenteId");

            const isAtivo = activeServiceId && activeServiceId !== "null" && activeServiceId !== "undefined";
            const isPendente = chamadoPendenteId && chamadoPendenteId !== "null" && chamadoPendenteId !== "undefined";

            if (isAtivo || isPendente) {
                if (quadroDireito) quadroDireito.style.display = 'none';
                container.style.display = 'none';
                return;
            }

            if (quadroDireito) quadroDireito.style.display = 'block';
            container.style.display = 'block';

            if (chamados.length === 0) {
                container.innerHTML = `<p style="text-align: center; color: #666;">Nenhum chamado disponível no momento.</p>`;
                return;
            }

            container.innerHTML = "";
            window.chamadosDisponiveis = chamados;

            chamados.forEach(chamado => {
                const isTelaChamados = window.location.pathname.includes('chamados.html');
                const lat = chamado.latitude ?? chamado.lat;
                const lng = chamado.longitude ?? chamado.lng;

                const btnMapaHtml = (isTelaChamados && lat !== undefined && lng !== undefined) ?
                    `<button class="btn-mapa-card" onclick="window.focarNoMapa(${lat}, ${lng})">Ver no mapa</button>` : '';

                const statusStr = chamado.status || "novo";
                const dataFormatada = chamado.dataCriacao ? new Date(chamado.dataCriacao).toLocaleDateString('pt-BR') : 'Sem data';

                const card = `
                    <div class="item-chamado status-${statusStr}">
                        <div class="item-header">
                            <strong>${chamado.endereco || 'Endereço não informado'}</strong>
                            <span class="status-badge status-${statusStr}">${statusStr.charAt(0).toUpperCase() + statusStr.slice(1)}</span>
                        </div>
                        <div class="item-info">
                            <p><small><strong>Serviço:</strong> ${chamado.tipoServico || 'Novo'}</small></p>
                            <p><small><strong>Observações:</strong> ${chamado.observacoes || 'Sem descrição'}</small></p>
                            <p><small><strong>Criado em:</strong> ${dataFormatada}</small></p>
                        </div>
                        <div class="item-acoes">
                            <button class="btn-detalhe" onclick="window.abrirDetalhesChamado(${chamado.id})">Detalhes</button>

                            ${btnMapaHtml}
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', card);
            });
        } else {
            container.innerHTML = `<p style="text-align: center; color: red;">Erro ao carregar chamados.</p>`;
        }
    } catch (error) {
        console.error("Erro ao buscar chamados:", error);
        container.innerHTML = `<p style="text-align: center; color: red;">Falha de conexão com o servidor.</p>`;
    }
};


// ===================================================================
// 6. CONTROLES DE INTERFACE (UI)
// ===================================================================

/**
 * Função: transicaoPosCheckin
 * O que faz: Altera dinamicamente os botões na tela inicial, escondendo
 * a preparação de serviço e habilitando os botões de Check-out e Abastecimento.
 */
window.transicaoPosCheckin = function () {
    const IDsEsconder = ['grupo-km-inicial', 'btn-salvar-veiculo', 'btn-cancelar-veiculo'];
    IDsEsconder.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const IDsMostrar = ['grupo-km-final', 'btn-abs-veiculo', 'btn-checkout', 'btn-cancelar-veiculo2', 'btn-ocorrencia-veiculo'];
    IDsMostrar.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'inline-block';
    });

    // Tenta preencher automaticamente o campo final com o valor salvo para agilizar a digitação
    const inputKmFinal = document.getElementById("quilometragem-final");
    const kmInicialSalvo = localStorage.getItem("km");
    if (inputKmFinal && kmInicialSalvo) {
        inputKmFinal.value = kmInicialSalvo;
    }
};

/**
 * Função: cancelarVeiculoInfo
 * O que faz: Interrompe a intenção de Check-in (antes de enviar à API),
 * restaurando a interface para o momento de seleção de viaturas.
 */
window.cancelarVeiculoInfo = function () {
    const secaoPosCheckin = document.getElementById('secao-pos-checkin');
    const infoVeiculoDados = document.getElementById('info-veiculo-dados');
    const containerCheckinBotao = document.getElementById('container-checkin-botao');

    if (secaoPosCheckin) secaoPosCheckin.style.display = 'none';
    if (infoVeiculoDados) infoVeiculoDados.style.display = 'none';
    if (containerCheckinBotao) containerCheckinBotao.style.display = 'block';

    localStorage.removeItem("selectedVehicle");

    if (typeof window.atualizarPainelChamadoAtual === "function") {
        window.atualizarPainelChamadoAtual();
    }
};

window.prepararAceiteChamado = function(idChamado, endereco) {
    localStorage.setItem("chamadoPendenteId", idChamado);
    if (endereco) {
        localStorage.setItem("chamadoPendenteEndereco", endereco);
    }

    if (typeof window.atualizarPainelChamadoAtual === "function") {
        window.atualizarPainelChamadoAtual();
    }

    // Refresh tickets to hide them since one was accepted
    carregarChamadosDisponiveis();
    window.fecharModalDetalhes();
}

window.atualizarPainelChamadoAtual = function() {
    const infoChamado = document.getElementById("info-chamado");
    if (!infoChamado) return;

    const activeServiceId = localStorage.getItem("activeServiceId");
    const chamadoPendenteId = localStorage.getItem("chamadoPendenteId");
    const chamadoPendenteEndereco = localStorage.getItem("chamadoPendenteEndereco");
    const selectedVehicle = localStorage.getItem("selectedVehicle");

    const isAtivoValid = activeServiceId && activeServiceId !== "null" && activeServiceId !== "undefined";
    const isPendenteValid = chamadoPendenteId && chamadoPendenteId !== "null" && chamadoPendenteId !== "undefined";

    if (isAtivoValid) {
        infoChamado.style.display = 'block';
        const endereco = localStorage.getItem("chamadoAtivoEndereco");
        if (endereco && endereco !== "undefined") {
            infoChamado.innerHTML = `<p style="color: #28a745;"><strong>Em atendimento:</strong></p><p>${endereco}</p>`;
        } else {
            infoChamado.innerHTML = `<p style="color: #ff9800;"><strong>Serviço Avulso (Ativo)</strong></p><p>Viatura em uso sem chamado vinculado.</p>`;
        }
    } else if (selectedVehicle) {
        infoChamado.style.display = 'block';
        if (isPendenteValid) {
            infoChamado.innerHTML = `<p style="color: #002080;"><strong>Check-in Pendente:</strong></p><p>${chamadoPendenteEndereco}</p>`;
        } else {
            infoChamado.innerHTML = `<p style="color: #ff9800;"><strong>Check-in Avulso Pendente</strong></p><p>Você pegou um carro sem aceitar chamado.</p>`;
        }
    } else {
        if (isPendenteValid) {
            infoChamado.style.display = 'block';
            infoChamado.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <p style="color: #002080; margin-bottom: 4px;"><strong>Aguardando Veículo:</strong></p>
                        <p style="font-size: 15px;">${chamadoPendenteEndereco}</p>
                    </div>
                    <button onclick="window.cancelarAceiteChamado()" style="background: none; border: none; color: #dc3545; cursor: pointer; text-decoration: underline; font-size: 13px;">Cancelar</button>
                </div>
             `;
        } else {
            infoChamado.style.display = 'none';
            infoChamado.innerHTML = ``;
        }
    }
}

window.cancelarAceiteChamado = function() {
    localStorage.removeItem("chamadoPendenteId");
    localStorage.removeItem("chamadoPendenteEndereco");
    if (typeof window.atualizarPainelChamadoAtual === "function") {
        window.atualizarPainelChamadoAtual();
    }
    carregarChamadosDisponiveis();
};

window.abrirDetalhesChamado = function (id) {
    if (!window.chamadosDisponiveis) return;
    const chamado = window.chamadosDisponiveis.find((item) => item.id === id);
    if (!chamado) return;

    const modal = document.getElementById("modalDetalheChamado");
    const titulo = document.getElementById("modalTitulo");
    const conteudo = document.getElementById("modalConteudo");

    if (!modal || !conteudo) return;

    const dataFormatada = chamado.dataCriacao ? new Date(chamado.dataCriacao).toLocaleDateString('pt-BR') : 'Sem data';

    if (titulo) {
        titulo.textContent = `Chamado - ${chamado.tipoServico || "Detalhes"}`;
    }

    conteudo.innerHTML = `
        <p><strong>Endereço:</strong> ${chamado.endereco || "Não informado"}</p>
        <p><strong>Tipo de Serviço:</strong> ${chamado.tipoServico || "Não informado"}</p>
        <p><strong>Observações:</strong> ${chamado.observacoes || "Nenhuma"}</p>
        <p><strong>Criado em:</strong> ${dataFormatada}</p>
    `;

    const popupButtons = modal.querySelector(".popup-buttons");
    if (popupButtons) {
        popupButtons.innerHTML = `
            <button class="btn-voltar" onclick="window.fecharModalDetalhes()">Recusar</button>
            <button class="btn-aceitar" onclick="window.prepararAceiteChamado(${chamado.id}, '${chamado.endereco || 'Chamado'}')">Aceitar</button>
        `;
    }

    modal.style.display = "flex";
};

window.fecharModalDetalhes = function () {
    const modal = document.getElementById("modalDetalheChamado");
    if (modal) modal.style.display = "none";
};

// ===================================================================
// 7. INICIALIZAÇÃO DE EVENTOS DO DOM
// ===================================================================
document.addEventListener("DOMContentLoaded", () => {
    carregarChamadosDisponiveis();
    if (typeof window.atualizarPainelChamadoAtual === "function") {
        window.atualizarPainelChamadoAtual();
    }

    // Adiciona listener para fechar o popup de sucesso caso haja o botão OK
    const btnFecharSucesso = document.getElementById("btn-fechar-sucesso-abs");
    if (btnFecharSucesso) {
        btnFecharSucesso.addEventListener("click", window.fecharPopupSucessoAbastecimento);
    }
});