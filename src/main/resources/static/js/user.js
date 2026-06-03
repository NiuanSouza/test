/**
 * ===================================================================
 * ARQUIVO: user.js (Versão Consolidada)
 * REFERÊNCIA GLOBAL: Projetado para trabalhar com 'basic.js', mas inclui
 * fallbacks locais para requisições e alertas visuais (Toast).
 * RESPONSABILIDADE: Gerenciar cadastro de usuários (Técnicos) e a
 * visualização/edição do perfil do usuário logado (incluindo avatar).
 * ===================================================================
 */

// ===================================================================
// 1. UTILITÁRIOS (Toast Fallback)
// ===================================================================

window.mostrarToast = window.mostrarToast || function (mensagem, classePersonalizada = "") {
    const toast = document.getElementById("toast-aviso");
    if (toast) {
        toast.innerText = mensagem;
        if (classePersonalizada) toast.className = classePersonalizada;
        toast.style.display = "block";
        toast.classList.remove("toast-hidden");

        setTimeout(() => {
            toast.classList.add("toast-hidden");
            setTimeout(() => { toast.style.display = "none"; }, 500);
        }, 3000);
    } else {
        alert(mensagem);
    }
};

// ===================================================================
// 2. CADASTRO DE USUÁRIO (Técnico)
// ===================================================================

window.cadastrarUsuario = async function () {
    const nameInput = document.getElementById("cadNome")?.value;
    const emailInput = document.getElementById("cadEmail")?.value;
    const registrationInput = document.getElementById("cadMatricula")?.value;
    const passwordInput = document.getElementById("cadSenha")?.value;

    if (!nameInput || !emailInput || !registrationInput || !passwordInput) {
        window.mostrarToast("Preencha todos os campos obrigatórios!");
        return;
    }

    const payload = {
        registration: registrationInput.trim(),
        name: nameInput.trim(),
        email: emailInput.trim(),
        password: passwordInput,
        permission: "TECHNICIAN" // Uppercase para bater com o Enum do Java
    };

    try {
        // Fallback: se apiFetch não existir, usa o fetch nativo
        const fetchFunc = window.apiFetch || function (url, options) {
            const baseUrl = "http://localhost:8080";
            return fetch(baseUrl + url, {
                ...options,
                headers: { "Content-Type": "application/json", ...options.headers }
            });
        };

        const response = await fetchFunc("/user/register", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        if (response && response.ok) {
            const popupConf = document.getElementById('popupConfirmacao');
            const popupSuc = document.getElementById('popupSucesso');

            if (popupConf) popupConf.style.display = 'none';

            if (popupSuc) {
                popupSuc.style.display = 'flex';
            } else {
                window.mostrarToast("Usuário cadastrado com sucesso!", "toast-aviso1");
            }

            limparFormularioUsuario();

        } else if (response) {
            // Tenta extrair JSON do Spring Boot, senão pega texto puro
            const erro = await response.json().catch(async () => {
                const text = await response.text();
                return { message: text };
            });
            const mensagemErro = erro.error || erro.message || "Verifique os dados informados.";
            window.mostrarToast("Erro ao cadastrar: " + mensagemErro);
        }
    } catch (error) {
        console.error("Erro na requisição de cadastro:", error);
        window.mostrarToast("Falha de conexão com o servidor.");
    }
};

function limparFormularioUsuario() {
    ["cadNome", "cadEmail", "cadMatricula", "cadSenha"].forEach(id => {
        const field = document.getElementById(id);
        if (field) field.value = "";
    });
}

// ===================================================================
// 3. GESTÃO DE PERFIL (Carregar, Editar e Upload de Foto)
// ===================================================================

window.carregarDadosUsuario = async function () {
    const registration = localStorage.getItem("userRegistration");
    const token = (window.CONFIG && CONFIG.TOKEN_KEY) ? localStorage.getItem(CONFIG.TOKEN_KEY) : localStorage.getItem("userToken");

    if (!registration) {
        console.warn("Matrícula não encontrada no localStorage. O usuário precisa fazer login.");
        return;
    }

    try {
        const fetchFunc = window.apiFetch || function (url, options) {
            const baseUrl = "http://localhost:8080";
            return fetch(baseUrl + url, {
                ...options,
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                    ...options.headers
                }
            });
        };

        const response = await fetchFunc(`/user/${registration}`, {
            method: "GET"
        });

        if (response && response.ok) {
            const user = await response.json();

            // Mapeamento de UI
            const inputEmail = document.getElementById("perfilEmail");
            const inputTelefone = document.getElementById("perfilTelefone");
            const selectCNH = document.getElementById("perfilCNH");
            const textNome = document.getElementById("perfilNome");
            const textRole = document.getElementById("perfilRole");
            const blocoCNH = document.getElementById("blocoCNH");
            const previewFoto = document.getElementById("previewFoto");
            const avatarPlaceholder = document.getElementById("avatarPlaceholder");

            // Permissão (Gestor ou Técnico)
            const permission = (window.CONFIG && CONFIG.PERMISSION_KEY) ? localStorage.getItem(CONFIG.PERMISSION_KEY) : localStorage.getItem("userPermission");
            const isManager = permission === "ADMINISTRATOR" || permission === "MANAGER";

            if (textRole) {
                textRole.innerText = isManager ? "Gestor" : "Técnico";
            }

            if (blocoCNH) {
                blocoCNH.style.display = "block";
            }

            // Preenchimento de dados
            if (inputEmail) inputEmail.value = user.email || "";
            if (inputTelefone) inputTelefone.value = user.phone || "";
            if (selectCNH) selectCNH.value = user.driverLicenseCategory || "";
            if (textNome) textNome.innerText = user.name || "Usuário";

            // Tratamento da imagem
            if (user.photo && user.photo.length > 5 && previewFoto) {
                previewFoto.src = user.photo.startsWith("data:image") ? user.photo : `data:image/jpeg;base64,${user.photo}`;
                previewFoto.style.display = "block";
                if (avatarPlaceholder) avatarPlaceholder.style.display = "none";
            }
        } else if (response) {
            console.error("Erro ao buscar perfil:", await response.text());
            window.mostrarToast("Erro ao carregar dados do perfil.");
        }
    } catch (error) {
        console.error("Erro de conexão ao buscar perfil:", error);
    }
};

window.atualizarPreviewFoto = function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById("previewFoto");
            const placeholder = document.getElementById("avatarPlaceholder");

            if (preview) {
                preview.src = e.target.result;
                preview.style.display = "block";
            }
            if (placeholder) {
                placeholder.style.display = "none";
            }
        }
        reader.readAsDataURL(file);
    }
};

window.salvarConfiguracoesPerfil = async function () {
    const registration = localStorage.getItem("userRegistration");
    const token = (window.CONFIG && CONFIG.TOKEN_KEY) ? localStorage.getItem(CONFIG.TOKEN_KEY) : localStorage.getItem("userToken");

    if (!registration) {
        window.mostrarToast("Sessão expirada. Faça login novamente.");
        return;
    }

    const emailInput = document.getElementById("perfilEmail")?.value;
    const senhaInput = document.getElementById("perfilSenha")?.value;
    const telefoneInput = document.getElementById("perfilTelefone")?.value;
    const cnhInput = document.getElementById("perfilCNH")?.value;

    const permission = (window.CONFIG && CONFIG.PERMISSION_KEY) ? localStorage.getItem(CONFIG.PERMISSION_KEY) : localStorage.getItem("userPermission");
    const isManager = permission === "ADMINISTRATOR" || permission === "MANAGER";

    const payloadTexto = {};
    if (emailInput) payloadTexto.email = emailInput;
    if (senhaInput) payloadTexto.password = senhaInput;
    if (telefoneInput) payloadTexto.phone = telefoneInput;
    if (cnhInput) payloadTexto.driverLicenseCategory = cnhInput;

    try {
        // Função Helper para manter a compatibilidade com apiFetch ou fetch nativo
        const apiCall = window.apiFetch || function (url, options, isFormData = false) {
            const baseUrl = "http://localhost:8080";
            const headers = { "Authorization": `Bearer ${token}` };
            if (!isFormData) headers["Content-Type"] = "application/json";

            return fetch(baseUrl + url, { ...options, headers });
        };

        // 1. Atualizar Dados em Texto (PATCH)
        if (Object.keys(payloadTexto).length > 0) {
            const resTexto = await apiCall(`/user/update/${registration}`, {
                method: "PATCH",
                body: JSON.stringify(payloadTexto)
            });

            if (!resTexto || !resTexto.ok) {
                window.mostrarToast("Erro ao atualizar os dados do perfil.");
                return;
            }
        }

        // 2. Atualizar Foto de Perfil (POST Multipart)
        const fotoInput = document.getElementById("perfilFoto");
        if (fotoInput && fotoInput.files.length > 0) {
            const fotoFile = fotoInput.files[0];
            const formData = new FormData();
            formData.append("foto", fotoFile); // O nome "foto" deve bater com @RequestParam("foto")

            // Se for formData, não passamos Content-Type (o browser gera automaticamente com o boundary)
            const resFoto = await apiCall(`/user/upload-photo/${registration}`, {
                method: "POST",
                body: formData
            }, true);

            if (!resFoto || !resFoto.ok) {
                window.mostrarToast("Dados salvos, mas erro ao enviar a imagem.");
                return;
            }
        }

        window.mostrarToast("Configurações salvas com sucesso!", "toast-aviso1");

        const inputSenha = document.getElementById("perfilSenha");
        if (inputSenha) inputSenha.value = "";

        setTimeout(() => window.carregarDadosUsuario(), 1500);

    } catch (error) {
        console.error("Erro ao salvar configurações:", error);
        window.mostrarToast("Erro de conexão com o servidor.");
    }
};

// ===================================================================
// 4. INICIALIZAÇÃO DE EVENTOS DOM (Modais e Botões)
// ===================================================================

document.addEventListener("DOMContentLoaded", () => {
    // ---- EVENTOS DA TELA DE CADASTRO ----
    const popupConfirmacao = document.getElementById('popupConfirmacao');
    const popupSucesso = document.getElementById('popupSucesso');

    const btnCadastrar = document.getElementById('btncadastrar');
    const btnCancelarConf = document.getElementById('btn-cancelar-confirmacao');
    const btnConfirmarFinal = document.getElementById('btn-confirmar-final');
    const btnFecharSucesso = document.getElementById('btn-fechar-sucesso');

    // Abre Modal de Confirmação
    if (btnCadastrar && popupConfirmacao) {
        btnCadastrar.addEventListener('click', () => {
            popupConfirmacao.style.display = 'flex';
        });
    }

    // Cancela Modal de Confirmação
    if (btnCancelarConf && popupConfirmacao) {
        btnCancelarConf.addEventListener('click', () => {
            popupConfirmacao.style.display = 'none';
        });
    }

    // Confirma Envio para API
    if (btnConfirmarFinal) {
        btnConfirmarFinal.addEventListener('click', (e) => {
            e.preventDefault(); // Impede refresh do formulário
            window.cadastrarUsuario();
        });
    }

    // Fecha Sucesso Final
    if (btnFecharSucesso && popupSucesso) {
        btnFecharSucesso.addEventListener('click', () => {
            popupSucesso.style.display = 'none';
        });
    }

    // ---- EVENTOS DA TELA DE PERFIL ----
    // Gatilho para carregar dados automaticamente se estiver na tela de configurações
    if (document.body.classList.contains("pagina-configuracoes")) {
        window.carregarDadosUsuario();
    }

    // Ouvinte para preview automático da foto ao selecionar arquivo
    const perfilFotoInput = document.getElementById('perfilFoto');
    if(perfilFotoInput) {
        perfilFotoInput.addEventListener('change', window.atualizarPreviewFoto);
    }
});