/**
 * ===================================================================
 * ARQUIVO: auth.js
 * REFERÊNCIA GLOBAL: Requer 'basic.js' (Utiliza apiFetch, mostrarToast e CONFIG)
 * RESPONSABILIDADE: Gerenciar as operações de autenticação do usuário,
 * capturar credenciais e tratar as interações de interface da tela de login.
 * ===================================================================
 */

window.btnindex = async function () {
    const regField = document.getElementById("matricula");
    const passField = document.getElementById("senha");

    if (!regField?.value.trim() || !passField?.value) {
        window.mostrarToast("Por favor, preencha todos os campos.");
        return;
    }

    const loginData = {
        registration: String(regField.value.trim()),
        password: passField.value
    };

    try {
        const response = await window.apiFetch("/user/login", {
            method: "POST",
            body: JSON.stringify(loginData)
        });

        if (response && response.ok) {
            const data = await response.json();

            if (data.token) {
                localStorage.setItem(CONFIG.TOKEN_KEY, data.token);
            }

            const payload = data.token ? CONFIG.decodeToken(data.token) : null;
            const permission = String(payload?.permission || data.permission || "TECHNICIAN")
                .toUpperCase()
                .replace("ROLE_", "");

            const name = payload?.name || data.name || "Usuário";

            // Persiste os dados básicos para o basic.js poder decidir a barra
            localStorage.setItem("userName", name);
            localStorage.setItem("userPermission", permission);
            localStorage.setItem("userRegistration", loginData.registration);

            CONFIG.redirectByPermission();

        } else if (response) {
            const errorData = await response.json().catch(() => ({}));
            const mensagem = errorData.error || errorData.message || "Matrícula ou senha incorretos.";
            window.mostrarToast(mensagem);
        }
    } catch (error) {
        console.error("Erro crítico na tentativa de login:", error);
        window.mostrarToast("Erro ao conectar com o servidor.");
    }
};

window.togglePassword = function () {
    const passwordField = document.getElementById("senha");
    const eyeLine = document.getElementById("eyeLine");

    if (passwordField) {
        const isPasswordHidden = passwordField.type === "password";
        passwordField.type = isPasswordHidden ? "text" : "password";

        if (eyeLine) {
            eyeLine.style.display = isPasswordHidden ? "block" : "none";
        }
    }
};

/**
 * ===================================================================
 * OPERAÇÕES DO MODAL DE RECUPERAÇÃO DE SENHA
 * ===================================================================
 */

window.abrirModalRecuperacao = function () {
    const modal = document.getElementById("modalRecuperarSenha");
    if (modal) {
        modal.style.display = "flex";
        setTimeout(() => {
            document.getElementById("email-recuperacao")?.focus();
        }, 100);
    }
};

window.fecharModalRecuperacao = function () {
    const modal = document.getElementById("modalRecuperarSenha");
    if (modal) {
        modal.style.display = "none";
    }
};

window.enviarRecuperacaoSenha = async function () {
    const emailField = document.getElementById("email-recuperacao");
    if (!emailField) return;

    const email = emailField.value.trim();

    if (email === "") {
        window.mostrarToast("Digite um e-mail.");
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        window.mostrarToast("Insira um e-mail válido");
        return;
    }

    try {
        const response = await window.apiFetch("/user/reset-password", {
            method: "POST",
            body: JSON.stringify({ email: email })
        });

        if (response && response.ok) {
            window.fecharModalRecuperacao();
            emailField.value = "";
            window.mostrarToast("E-mail enviado com sucesso! Verifique sua caixa de entrada.", "toast-aviso1");
        } else if (response) {
            const errorData = await response.json().catch(() => ({}));
            const mensagem = errorData.error || "Erro ao solicitar recuperação.";
            window.mostrarToast(mensagem);
        }
    } catch (error) {
        console.error("Erro ao enviar email:", error);
        window.mostrarToast("Erro ao conectar com o servidor.");
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const passField = document.getElementById("senha");
    if (passField) {
        passField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                window.btnindex();
            }
        });
    }

    const emailRecuperacaoField = document.getElementById("email-recuperacao");
    if (emailRecuperacaoField) {
        emailRecuperacaoField.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                window.enviarRecuperacaoSenha();
            }
        });
    }

    const modalRecuperarSenha = document.getElementById("modalRecuperarSenha");
    if (modalRecuperarSenha) {
        modalRecuperarSenha.addEventListener("click", (event) => {
            if (event.target.id === "modalRecuperarSenha") {
                window.fecharModalRecuperacao();
            }
        });
    }
});