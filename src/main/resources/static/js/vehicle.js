/**
 * js/vehicle.js
 * Responsável por: Cadastro, Listagem, Filtros e Seleção de Veículos.
 */

// ===================================================================
// UTILS
// ===================================================================
const traduzirCategoria = (cat) => {
    if (!cat) return 'PASSEIO';
    cat = cat.toLowerCase();
    if (cat === 'passenger') return 'PASSEIO';
    if (cat === 'utility') return 'UTILITÁRIO';
    return cat.toUpperCase();
};

let veiculosAtuaisDisponiveis = [];

// ===================================================================
// 1. CADASTRO DE VEÍCULOS
// ===================================================================

// Busca os modelos (Tipos de Carro) cadastrados para preencher o <select>
async function carregarTiposVeiculo() {
    const selectTipo = document.getElementById("cad-tipo-selecionado");
    if (!selectTipo) return;

    try {
        const response = await apiFetch("/vehicle/types");
        if (response && response.ok) {
            const tipos = await response.json();
            window.tiposCarregados = tipos; // Salva para uso futuro
            
            selectTipo.innerHTML = '<option value="">Novo Tipo (Preencher manualmente)</option>';

            tipos.forEach(tipo => {
                const categoriaPt = traduzirCategoria(tipo.category);
                const option = document.createElement("option");
                option.value = tipo.id;
                option.textContent = `${tipo.brand} ${tipo.model} (${tipo.year}) - ${categoriaPt}`;
                selectTipo.appendChild(option);
            });
        } else {
            selectTipo.innerHTML = '<option value="">Erro ao carregar tipos.</option>';
        }
    } catch (error) {
        console.error("Erro ao carregar tipos de veículo:", error);
        if (selectTipo) selectTipo.innerHTML = '<option value="">Servidor offline.</option>';
    }
}

window.aoMudarTipoVeiculo = function() {
    const selectTipo = document.getElementById("cad-tipo-selecionado");
    const inputMarca = document.getElementById("cad-marca");
    const inputModelo = document.getElementById("cad-modelo");
    const inputAno = document.getElementById("cad-ano");
    const selectCategoria = document.getElementById("cad-categoria");
    
    if (!selectTipo || !inputMarca || !inputModelo || !inputAno || !selectCategoria) return;
    
    const idSelecionado = selectTipo.value;
    
    if (idSelecionado) {
        // Encontrou um tipo existente
        const tipo = window.tiposCarregados?.find(t => t.id == idSelecionado);
        if (tipo) {
            inputMarca.value = tipo.brand || "";
            inputMarca.setAttribute("value", tipo.brand || "");
            
            inputModelo.value = tipo.model || "";
            inputModelo.setAttribute("value", tipo.model || "");
            
            inputAno.value = tipo.year || "";
            inputAno.setAttribute("value", tipo.year || "");
            
            const catLower = tipo.category ? tipo.category.toLowerCase() : "passenger";
            selectCategoria.value = catLower;
            selectCategoria.setAttribute("value", catLower);
            
            inputMarca.setAttribute("readonly", true);
            inputModelo.setAttribute("readonly", true);
            inputAno.setAttribute("readonly", true);
            selectCategoria.setAttribute("disabled", true);
        }
    } else {
        // Novo Tipo
        inputMarca.value = "";
        inputMarca.removeAttribute("value");
        
        inputModelo.value = "";
        inputModelo.removeAttribute("value");
        
        inputAno.value = "";
        inputAno.removeAttribute("value");
        
        selectCategoria.value = "passenger";
        selectCategoria.setAttribute("value", "passenger");
        
        inputMarca.removeAttribute("readonly");
        inputModelo.removeAttribute("readonly");
        inputAno.removeAttribute("readonly");
        selectCategoria.removeAttribute("disabled");
    }
}

// Envia os dados do formulário para registrar uma nova viatura física
window.cadastrarVeiculo = async function () {
    const prefixo = document.getElementById("cad-prefixo")?.value;
    const placa = document.getElementById("cad-placa")?.value;
    const cor = document.getElementById("cad-cor")?.value;
    
    const tipoSelecionado = document.getElementById("cad-tipo-selecionado")?.value;
    const marca = document.getElementById("cad-marca")?.value;
    const modelo = document.getElementById("cad-modelo")?.value;
    const ano = document.getElementById("cad-ano")?.value;
    const categoria = document.getElementById("cad-categoria")?.value;

    if (!prefixo || !placa || (!tipoSelecionado && (!marca || !modelo || !ano))) {
        window.mostrarToast("Por favor, preencha o Prefixo, Placa e as informações do Modelo.");
        return;
    }

    let payloadType = {};
    if (tipoSelecionado) {
        payloadType = { id: parseInt(tipoSelecionado) };
    } else {
        payloadType = {
            brand: marca.trim(),
            model: modelo.trim(),
            year: parseInt(ano),
            category: categoria
        };
    }

    const payload = {
        prefix: prefixo.trim(),
        licensePlate: placa.trim(),
        color: cor || "Não informada",
        available: true,
        currentKm: 0.0,
        type: payloadType
    };

    try {
        const response = await apiFetch("/vehicle/register", { method: "POST", body: JSON.stringify(payload) });

        if (response && response.ok) {
            const popupConf = document.getElementById('popupConfirmacao');
            const popupSuc = document.getElementById('popupSucesso');
            const msgSucesso = document.getElementById("mensagem-sucesso");

            if (popupConf) popupConf.style.display = 'none';
            if (msgSucesso) msgSucesso.textContent = "Veículo cadastrado com sucesso!";

            if (popupSuc) {
                popupSuc.style.display = 'flex';
                popupSuc.setAttribute("data-action", "cadastro");
            } else {
                window.mostrarToast("Veículo cadastrado!", "toast-aviso1");
            }
            limparFormulario();
        } else if (response) {
            const erro = await response.json();
            window.mostrarToast("Erro no cadastro: " + (erro.error || "Verifique os dados."));
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
        window.mostrarToast("Falha ao conectar com o servidor.");
    }
};

function limparFormulario() {
    ["cad-prefixo", "cad-placa", "cad-cor", "cad-marca", "cad-modelo", "cad-ano"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    
    const selectTipo = document.getElementById("cad-tipo-selecionado");
    if (selectTipo) {
        selectTipo.value = "";
        window.aoMudarTipoVeiculo();
    }
}

// ===================================================================
// 2. LISTAGEM DE VEÍCULOS DISPONÍVEIS
// ===================================================================
async function carregarVeiculosDisponiveis() {
    const listaVeiculos = document.getElementById("listaVeiculos");
    if (!listaVeiculos) return;

    listaVeiculos.innerHTML = '<p style="text-align:center; padding: 20px;">Carregando veículos...</p>';

    try {
        const response = await apiFetch("/vehicle");
        if (response && response.ok) {
            const veiculos = await response.json();
            listaVeiculos.innerHTML = '';
            let veiculosLivres = 0;
            const disponiveis = [];

            veiculos.forEach(v => {
                // Filtra para exibir apenas veículos que não estão em uso ou manutenção
                if (v.available === false || String(v.available) === "false" || v.vehicleStatus === "IN_USE" || v.vehicleStatus === "MAINTENANCE") {
                    return;
                }
                veiculosLivres++;
                disponiveis.push(v);

                const marca = v.type ? v.type.brand : 'Desconhecida';
                const modelo = v.type ? v.type.model : 'Desconhecido';
                const categoria = traduzirCategoria(v.type ? v.type.category : '');
                const kmAtual = (v.currentKm !== undefined && v.currentKm !== null) ? v.currentKm : 0;

                const btn = document.createElement("button");
                btn.className = "btn-veiculo";
                btn.setAttribute("data-tipo", categoria.toUpperCase());
                btn.setAttribute("data-marca", marca.toUpperCase());
                btn.textContent = `Viatura ${v.prefix} - ${modelo}`;

                // Ao clicar, o veículo é selecionado temporariamente
                btn.onclick = () => selecionarVeiculo(
                    `Viatura ${v.prefix}`, modelo, marca, categoria, v.prefix, v.licensePlate, kmAtual
                );

                listaVeiculos.appendChild(btn);
            });

            if (veiculosLivres === 0) {
                listaVeiculos.innerHTML = '<p style="text-align:center; padding: 20px;">Nenhum veículo disponível no momento.</p>';
                veiculosAtuaisDisponiveis = [];
            } else {
                veiculosAtuaisDisponiveis = disponiveis;
            }
        } else {
            listaVeiculos.innerHTML = '<p style="text-align:center; padding: 20px; color: red;">Erro ao carregar veículos.</p>';
            veiculosAtuaisDisponiveis = [];
        }
    } catch (error) {
        console.error("Erro ao buscar veículos:", error);
        listaVeiculos.innerHTML = '<p style="text-align:center; padding: 20px; color: red;">Falha de conexão com o servidor.</p>';
        veiculosAtuaisDisponiveis = [];
    }
}

window.exportarVeiculosCSV = function () {
    if (!veiculosAtuaisDisponiveis || veiculosAtuaisDisponiveis.length === 0) {
        window.mostrarToast("Nenhum veículo disponível para exportar.", "toast-aviso");
        return;
    }

    const headers = ["Prefixo", "Placa", "Modelo", "Marca", "Tipo", "KM Atual", "Disponível"];
    const rows = [headers.join(",")];

    veiculosAtuaisDisponiveis.forEach(v => {
        const categoria = traduzirCategoria(v.type ? v.type.category : "");
        const model = v.type ? v.type.model : "Desconhecido";
        const brand = v.type ? v.type.brand : "Desconhecida";
        const status = (v.available === false || String(v.available) === "false") ? "Não" : "Sim";

        const row = [
            v.prefix || "",
            v.licensePlate || "",
            model,
            brand,
            categoria,
            v.currentKm !== undefined && v.currentKm !== null ? v.currentKm : "0",
            status
        ];

        rows.push(row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","));
    });

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `veiculos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    window.mostrarToast("Exportação iniciada.", "toast-aviso1");
};


// ===================================================================
// 3. SELEÇÃO DE VEÍCULO
// ===================================================================
let tempVehicle = {};

window.abrirModalConfirmacao = function() {
    const modal = document.getElementById("modalConfirmacao");
    if (modal) {
        modal.style.display = "flex";
        carregarVeiculosDisponiveis(); // Recarrega a lista para garantir dados frescos
    }
};

window.selecionarVeiculo = (title, model, brand, type, prefix, licensePlate, currentKm) => {
    // Guarda na variável temporária antes da confirmação final
    tempVehicle = { title, model, brand, type, prefix, licensePlate, currentKm };

    // Atualiza o DOM do Modal de Detalhes
    if (document.getElementById("fotoVeiculo")) document.getElementById("fotoVeiculo").src = "img/carro 1.jpg";
    if (document.getElementById("modeloVeiculo")) document.getElementById("modeloVeiculo").textContent = model;
    if (document.getElementById("marcaVeiculo")) document.getElementById("marcaVeiculo").textContent = brand;
    if (document.getElementById("tipoVeiculo")) document.getElementById("tipoVeiculo").textContent = type;
    if (document.getElementById("placaVeiculo")) document.getElementById("placaVeiculo").textContent = licensePlate;
    if (document.getElementById("prefixoVeiculo")) document.getElementById("prefixoVeiculo").textContent = prefix;
    if (document.getElementById("quilometragem")) document.getElementById("quilometragem").textContent = (currentKm || 0) + " km";

    if (document.getElementById("modalConfirmacao")) document.getElementById("modalConfirmacao").style.display = "none";
    if (document.getElementById("modalDetalhesVeiculo")) document.getElementById("modalDetalhesVeiculo").style.display = "flex";
};

window.voltarParaVeiculos = () => {
    if (document.getElementById("modalDetalhesVeiculo")) document.getElementById("modalDetalhesVeiculo").style.display = "none";
    if (document.getElementById("modalConfirmacao")) document.getElementById("modalConfirmacao").style.display = "flex";
};

// Confirma o uso do veículo e prepara o painel lateral de Check-in
window.confirmarVeiculo = () => {
    localStorage.setItem("selectedVehicle", JSON.stringify(tempVehicle));

    const inputKm = document.getElementById("quilometragem-inicial");
    const inputData = document.getElementById("data-inicial");
    const inputHora = document.getElementById("horario-inicial");

    // Preenche KM automaticamente e seta Data/Hora atuais
    if (inputKm) inputKm.value = tempVehicle.currentKm;
    const agora = new Date();
    if (inputData) inputData.value = new Date(agora.getTime() - (agora.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    if (inputHora) inputHora.value = agora.toTimeString().split(' ')[0].substring(0, 5);

    // Esconde o botão de selecionar e mostra os inputs do check-in
    const secaoPosCheckin = document.getElementById('secao-pos-checkin');
    const infoVeiculoDados = document.getElementById('info-veiculo-dados');
    const containerCheckinBotao = document.getElementById('container-checkin-botao');

    if (secaoPosCheckin) secaoPosCheckin.style.display = 'block';
    if (infoVeiculoDados) infoVeiculoDados.style.display = 'block';
    if (containerCheckinBotao) containerCheckinBotao.style.display = 'none';

    // Exibe os dados do veículo selecionado na sidebar
    if (document.getElementById('display-modelo')) document.getElementById('display-modelo').textContent = tempVehicle.model;
    if (document.getElementById('display-placa')) document.getElementById('display-placa').textContent = tempVehicle.licensePlate;
    if (document.getElementById('display-prefixo')) document.getElementById('display-prefixo').textContent = tempVehicle.prefix;

    const modalDet = document.getElementById("modalDetalhesVeiculo");
    if (modalDet) modalDet.style.display = "none";
    
    if (typeof window.atualizarPainelChamadoAtual === "function") {
        window.atualizarPainelChamadoAtual();
    }
};

// ===================================================================
// 4. SISTEMA DE FILTROS DO MODAL
// ===================================================================
window.abrirModalFiltro = function () {
    const modal = document.getElementById('modalFiltroAvancado');
    if (modal) modal.style.display = 'flex';
};

window.fecharModalFiltro = function () {
    const modal = document.getElementById('modalFiltroAvancado');
    if (modal) modal.style.display = 'none';
};

window.aplicarFiltros = function () {
    const pesquisa = document.getElementById('inputPesquisa')?.value.toUpperCase() || "";
    const tipo = document.getElementById('filtroTipo')?.value.toUpperCase() || "TODOS";
    const marca = document.getElementById('filtroMarca')?.value.toUpperCase() || "TODOS";
    const botoes = document.querySelectorAll('.btn-veiculo');

    botoes.forEach(btn => {
        const txtBotao = btn.textContent.toUpperCase();
        const vTipo = (btn.getAttribute('data-tipo') || "").toUpperCase();
        const vMarca = (btn.getAttribute('data-marca') || "").toUpperCase();

        const batePesquisa = txtBotao.includes(pesquisa);
        const bateTipo = (tipo === "TODOS" || vTipo === tipo);
        const bateMarca = (marca === "TODOS" || vMarca === marca);

        if (batePesquisa && bateTipo && bateMarca) {
            btn.style.display = "block";
        } else {
            btn.style.display = "none";
        }
    });
    fecharModalFiltro();
};

window.filtrarVeiculos = () => aplicarFiltros();

// ===================================================================
// 5. INICIALIZAÇÃO DE EVENTOS DOM
// ===================================================================
document.addEventListener("DOMContentLoaded", () => {
    // Carrega dados base dependendo de qual tela o usuário está
    if (document.getElementById("cad-tipo-selecionado")) carregarTiposVeiculo();
    if (document.getElementById("listaVeiculos")) carregarVeiculosDisponiveis();

    // Configuração dos botões de cadastro (Tela do Gestor)
    const popupConfirmacaoCad = document.getElementById('popupConfirmacao');
    const btncadastrar = document.getElementById('btncadastrar');
    const btnConfirmarFinal = document.getElementById('btn-confirmar-final');

    if (btncadastrar && popupConfirmacaoCad) {
        btncadastrar.addEventListener('click', () => {
            popupConfirmacaoCad.style.display = 'flex';
        });
    }

    if (btnConfirmarFinal) {
        btnConfirmarFinal.onclick = (e) => {
            e.preventDefault();
            cadastrarVeiculo();
        };
    }
});

const veiculosSample = [
    {
        id: 101,
        model: "Fiat Mobi",
        brand: "Fiat",
        type: "Sedan",
        prefix: "1234",
        licensePlate: "ABC-1234",
        status: "Disponível"
    },
    {
        id: 102,
        model: "VW Gol",
        brand: "Volkswagen",
        type: "Hatch",
        prefix: "5678",
        licensePlate: "DEF-5678",
        status: "Em manutenção"
    },
    {
        id: 103,
        model: "Toyota Hilux",
        brand: "Toyota",
        type: "Pick-up",
        prefix: "7890",
        licensePlate: "GHI-9012",
        status: "Em uso"
    },
    {
        id: 104,
        model: "Chevrolet Onix",
        brand: "Chevrolet",
        type: "Hatch",
        prefix: "3456",
        licensePlate: "JKL-3456",
        status: "Disponível"
    }
];

let veiculosAtuais = [...veiculosSample];
let veiculosFiltrados = [...veiculosAtuais];

function renderizarVeiculos(lista) {
    const corpo = document.getElementById("veiculosTabelaCorpo");
    if (!corpo) return;

    if (!lista || lista.length === 0) {
        corpo.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding: 32px 0; color: #4a5c7f;">Nenhum veículo encontrado.</td>
            </tr>
        `;
        return;
    }

    corpo.innerHTML = lista.map(veiculo => {
        return `
            <tr>
                <td>${veiculo.model}</td>
                <td>${veiculo.brand}</td>
                <td>${veiculo.prefix}</td>
                <td>${veiculo.licensePlate}</td>
                <td>${veiculo.type}</td>
                <td><span class="status-badge ${obterStatusClass(veiculo.status)}">${veiculo.status}</span></td>
            </tr>
        `;
    }).join("");
}

function obterStatusClass(status) {
    return `status-${String(status).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')}`;
}

function aplicarFiltroVeiculos() {
    const termo = document.getElementById("filtroBuscaVeiculo").value.trim().toLowerCase();
    const filtrados = veiculosAtuais.filter(veiculo => {
        return [
            veiculo.model,
            veiculo.brand,
            veiculo.prefix,
            veiculo.licensePlate,
            veiculo.type,
            veiculo.status
        ].some(valor => (valor || "").toLowerCase().includes(termo));
    });

    veiculosFiltrados = filtrados;
    renderizarVeiculos(veiculosFiltrados);
}

function limparFiltroVeiculos() {
    const campo = document.getElementById("filtroBuscaVeiculo");
    if (campo) campo.value = "";
    veiculosFiltrados = [...veiculosAtuais];
    renderizarVeiculos(veiculosFiltrados);
}

async function carregarVeiculos() {
    try {
        const response = await window.apiFetch("/vehicle", { method: "GET" });
        if (response && response.ok) {
            const data = await response.json();
            veiculosAtuais = data.map(v => ({
                id: v.prefix, // Car usa prefix como ID
                model: v.type ? v.type.model : "Desconhecido",
                brand: v.type ? v.type.brand : "Desconhecido",
                type: v.type ? v.type.category : "Desconhecido",
                prefix: v.prefix,
                licensePlate: v.licensePlate,
                status: v.vehicleStatus || "Disponível"
            }));
            veiculosFiltrados = [...veiculosAtuais];
            renderizarVeiculos(veiculosFiltrados);
            return;
        }
    } catch (error) {
        console.warn("Backend indisponível para carregar veículos, utilizando dados mockados.", error);
    }
    veiculosAtuais = [...veiculosSample];
    veiculosFiltrados = [...veiculosAtuais];
    renderizarVeiculos(veiculosFiltrados);
}

window.tiposVeiculosAtuais = [];

async function carregarTiposVeiculos() {
    try {
        const response = await window.apiFetch("/vehicle/types", { method: "GET" });
        if (response && response.ok) {
            const data = await response.json();
            window.tiposVeiculosAtuais = data;
            renderizarTiposVeiculos(window.tiposVeiculosAtuais);
        }
    } catch (error) {
        console.warn("Backend indisponível para carregar tipos de veículos.", error);
    }
}

function renderizarTiposVeiculos(lista) {
    const corpo = document.getElementById("tiposVeiculosTabelaCorpo");
    if (!corpo) return;

    if (!lista || lista.length === 0) {
        corpo.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding: 32px 0; color: #4a5c7f;">Nenhum tipo de veículo encontrado.</td>
            </tr>
        `;
        return;
    }

    corpo.innerHTML = lista.map(tipo => {
        return `
            <tr>
                <td>${tipo.id}</td>
                <td>${tipo.brand || '-'}</td>
                <td>${tipo.model || '-'}</td>
                <td>${tipo.year || '-'}</td>
                <td>${tipo.category || '-'}</td>
            </tr>
        `;
    }).join("");
}

window.alternarAbaVeiculos = function(aba) {
    const btnVeiculos = document.getElementById("btnAbaVeiculos");
    const btnTipos = document.getElementById("btnAbaTipos");
    const tabVeiculos = document.getElementById("tabVeiculos");
    const tabTipos = document.getElementById("tabTipos");

    if (!btnVeiculos || !btnTipos || !tabVeiculos || !tabTipos) return;

    if (aba === 'veiculos') {
        btnVeiculos.classList.add("aba-ativa");
        btnVeiculos.classList.remove("aba-inativa");
        btnTipos.classList.remove("aba-ativa");
        btnTipos.classList.add("aba-inativa");

        tabVeiculos.style.display = "block";
        tabTipos.style.display = "none";
    } else {
        btnTipos.classList.add("aba-ativa");
        btnTipos.classList.remove("aba-inativa");
        btnVeiculos.classList.remove("aba-ativa");
        btnVeiculos.classList.add("aba-inativa");

        tabTipos.style.display = "block";
        tabVeiculos.style.display = "none";

        if (window.tiposVeiculosAtuais.length === 0) {
            carregarTiposVeiculos();
        }
    }
}

window.addEventListener("DOMContentLoaded", () => {
    carregarVeiculos();
    carregarTiposVeiculos();
});