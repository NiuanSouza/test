const exportacaoDefaultTecnicos = [
    { id: 1, name: "Ana Paula Martins", registration: "T-001", email: "ana.martins@example.com", phone: "(11) 94567-1234", setor: "Manutenção", perfil: "Técnico de campo", status: "Ativo" },
    { id: 2, name: "Bruno Lima", registration: "T-002", email: "bruno.lima@example.com", phone: "(11) 93451-9876", setor: "Fiscalização", perfil: "Técnico especializado", status: "Ativo" }
];

const exportacaoDefaultVeiculos = [
    { id: 101, model: "Fiat Mobi", brand: "Fiat", prefix: "1234", licensePlate: "ABC-1234", type: "Sedan", status: "Disponível" },
    { id: 102, model: "VW Gol", brand: "Volkswagen", prefix: "5678", licensePlate: "DEF-5678", type: "Hatch", status: "Em manutenção" }
];

let exportacaoTipoAtual = null;
let exportacaoItensSelecionados = [];

function abrirPopupExportacao(tipo) {
    exportacaoTipoAtual = tipo;
    exportacaoItensSelecionados = [];
    const isTecnicos = tipo === 'tecnicos';
    const titulo = document.getElementById("popupExportacaoTitulo");
    const subtitulo = document.getElementById("popupExportacaoSubtitulo");
    const listaItens = document.getElementById("listaExportacaoItens");
    // Usar os dados da tabela filtrados se possível, senão os atuais
    let itens = [];
    if (isTecnicos) {
        itens = (typeof window.tecnicosAtuais !== 'undefined' && window.tecnicosAtuais.length > 0) ? window.tecnicosAtuais : exportacaoDefaultTecnicos;
    } else {
        itens = (typeof window.veiculosAtuais !== 'undefined' && window.veiculosAtuais.length > 0) ? window.veiculosAtuais : exportacaoDefaultVeiculos;
    }

    if (titulo) titulo.textContent = isTecnicos ? "Exportar técnicos" : "Exportar veículos";
    if (subtitulo) subtitulo.textContent = isTecnicos ? "Selecione os itens que deseja exportar" : "Selecione os itens que deseja exportar";

    if (listaItens) {
        if (!itens || itens.length === 0) {
            listaItens.innerHTML = `<div class="popup-list-empty" style="text-align: center; padding: 20px; color: #4a5c7f;">Nenhum item disponível para exportação.</div>`;
        } else {
            listaItens.innerHTML = itens.map(item => {
                if (isTecnicos) {
                    const idParaExportacao = item.registration || item.id;
                    const nome = item.name || "Técnico sem nome";
                    return `
            <label class="exportacao-lista-item" style="display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-radius: 12px; background: #ffffff; border: 1px solid rgba(0, 32, 128, 0.12); cursor: pointer; width: 100%; box-sizing: border-box; position: relative;">
                <input type="checkbox" name="exportar-tecnico" value="${idParaExportacao}" style="width: 18px; height: 18px; flex-shrink: 0; cursor: pointer;">
                <span style="font-size: 14px; color: #12255c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${nome} — ${idParaExportacao}</span>
            </label>`;
                }

                return `
            <label class="exportacao-lista-item" style="display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-radius: 12px; background: #ffffff; border: 1px solid rgba(0, 32, 128, 0.12); cursor: pointer; width: 100%; box-sizing: border-box; position: relative;">
                <input type="checkbox" name="exportar-veiculo" value="${item.id}" style="width: 18px; height: 18px; flex-shrink: 0; cursor: pointer;">
                <span style="font-size: 14px; color: #12255c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${item.model} — ${item.prefix} — ${item.licensePlate}</span>
            </label>`;
            }).join("");
        }
    }

    const popup = document.getElementById("popupExportacao");
    if (popup) {
        popup.style.display = "flex";
        popup.style.alignItems = "center";
        popup.style.justifyContent = "center";
    }
}

function selecionarTodosExportacao() {
    const checkboxes = document.querySelectorAll('#listaExportacaoItens input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
}

function limparSelecaoExportacao() {
    const checkboxes = document.querySelectorAll('#listaExportacaoItens input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
}

function fecharPopupExportacao() {
    const popup = document.getElementById("popupExportacao");
    if (popup) popup.style.display = "none";
}

function abrirPopupExportOpcao() {
    fecharPopupExportacao();
    const popup = document.getElementById("popupExportOpcao");
    if (popup) popup.style.display = "flex";
}

function fecharPopupExportOpcao() {
    const popup = document.getElementById("popupExportOpcao");
    if (popup) popup.style.display = "none";
}

function exportarXmlSelecionados() {
    if (!exportacaoTipoAtual) {
        mostrarToast("Tipo de exportação não definido.");
        return;
    }

    const isTecnicos = exportacaoTipoAtual === 'tecnicos';
    const checkboxes = Array.from(document.querySelectorAll(`input[name="${isTecnicos ? 'exportar-tecnico' : 'exportar-veiculo'}"]:checked`));
    const tecnicos = typeof tecnicosFiltrados !== 'undefined' ? tecnicosFiltrados : (typeof tecnicosAtuais !== 'undefined' ? tecnicosAtuais : exportacaoDefaultTecnicos);
    const veiculos = typeof veiculosFiltrados !== 'undefined' ? veiculosFiltrados : (typeof veiculosAtuais !== 'undefined' ? veiculosAtuais : exportacaoDefaultVeiculos);
    const itens = isTecnicos ? tecnicos.filter(item => checkboxes.some(cb => cb.value == item.id || cb.value == item.registration)) : veiculos.filter(item => checkboxes.some(cb => cb.value == item.id));

    if (itens.length === 0) {
        mostrarToast(isTecnicos ? "Selecione ao menos um técnico para exportar." : "Selecione ao menos um veículo para exportar.");
        return;
    }

    exportacaoItensSelecionados = itens;
    abrirPopupExportOpcao();
}

function exportarComo(formato) {
    if (!exportacaoItensSelecionados || exportacaoItensSelecionados.length === 0) {
        mostrarToast("Nenhum item selecionado para exportar.");
        return;
    }

    const isTecnicos = exportacaoTipoAtual === 'tecnicos';
    const nomeBase = `${exportacaoTipoAtual}-${Date.now()}`;

    if (formato === 'xml') {
        const xml = isTecnicos ? gerarXmlExportacao('tecnicos', exportacaoItensSelecionados) : gerarXmlExportacao('veiculos', exportacaoItensSelecionados);
        downloadXml(xml, `${nomeBase}.xml`);
    } else if (formato === 'excel') {
        const csv = gerarCsvExportacao(isTecnicos ? 'tecnicos' : 'veiculos', exportacaoItensSelecionados);
        downloadTexto(csv, `${nomeBase}.csv`, 'text/csv');
    } else if (formato === 'doc') {
        const doc = gerarDocExportacao(isTecnicos ? 'tecnicos' : 'veiculos', exportacaoItensSelecionados);
        downloadTexto(doc, `${nomeBase}.doc`, 'application/msword');
    }

    exportacaoItensSelecionados = [];
    fecharPopupExportOpcao();
}

function gerarCsvExportacao(tipo, itens) {
    if (tipo === 'tecnicos') {
        const cabecalho = ['ID', 'Nome', 'Matrícula', 'E-mail', 'Telefone', 'Setor', 'Perfil', 'Status'];
        const linhas = itens.map(tecnico => [
            tecnico.registration || tecnico.id,
            tecnico.name,
            tecnico.registration,
            tecnico.email,
            tecnico.phone || '',
            tecnico.setor || '',
            tecnico.perfil || '',
            tecnico.status || ''
        ].map(valor => `"${valor}"`).join(','));
        return `${cabecalho.join(',')}\n${linhas.join('\n')}`;
    }

    const cabecalho = ['ID', 'Modelo', 'Marca', 'Prefixo', 'Placa', 'Tipo', 'Status'];
    const linhas = itens.map(veiculo => [
        veiculo.id,
        veiculo.model,
        veiculo.brand,
        veiculo.prefix,
        veiculo.licensePlate,
        veiculo.type,
        veiculo.status
    ].map(valor => `"${valor}"`).join(','));
    return `${cabecalho.join(',')}\n${linhas.join('\n')}`;
}

function gerarDocExportacao(tipo, itens) {
    if (tipo === 'tecnicos') {
        return itens.map(tecnico => `Técnico: ${tecnico.name}\nMatrícula: ${tecnico.registration}\nE-mail: ${tecnico.email}\nTelefone: ${tecnico.phone || '-'}\nSetor: ${tecnico.setor || '-'}\nPerfil: ${tecnico.perfil || '-'}\nStatus: ${tecnico.status || '-'}\n\n`).join('');
    }
    return itens.map(veiculo => `Veículo: ${veiculo.model} (${veiculo.licensePlate})\nMarca: ${veiculo.brand}\nPrefixo: ${veiculo.prefix}\nTipo: ${veiculo.type}\nStatus: ${veiculo.status}\n\n`).join('');
}

function downloadTexto(textContent, fileName, mimeType) {
    const blob = new Blob([textContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function gerarXmlExportacao(tipo, itens) {
    if (tipo === 'tecnicos') {
        const tecnicosXml = itens.map(tecnico => `
        <tecnico>
            <id>${tecnico.registration || tecnico.id}</id>
            <nome>${tecnico.name}</nome>
            <matricula>${tecnico.registration}</matricula>
            <email>${tecnico.email}</email>
            <telefone>${tecnico.phone || ""}</telefone>
            <setor>${tecnico.setor || ""}</setor>
            <perfil>${tecnico.perfil || ""}</perfil>
            <status>${tecnico.status}</status>
        </tecnico>`).join("\n");

        return `<?xml version="1.0" encoding="UTF-8"?>\n<exportacao>\n  <tecnicos>\n${tecnicosXml}\n  </tecnicos>\n</exportacao>`;
    }

    const veiculosXml = itens.map(veiculo => `
        <veiculo>
            <id>${veiculo.id}</id>
            <modelo>${veiculo.model}</modelo>
            <marca>${veiculo.brand}</marca>
            <prefixo>${veiculo.prefix}</prefixo>
            <placa>${veiculo.licensePlate}</placa>
            <tipo>${veiculo.type}</tipo>
            <status>${veiculo.status}</status>
        </veiculo>`).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>\n<exportacao>\n  <veiculos>\n${veiculosXml}\n  </veiculos>\n</exportacao>`;
}

function downloadXml(xmlContent, fileName) {
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
