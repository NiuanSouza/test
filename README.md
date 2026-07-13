# SIVA - Sistema Integrado de Viaturas e Atendimentos

O **SIVA** é um sistema completo (Full-Stack) focado no gerenciamento de frotas, controle de viagens, rastreamento de chamados e manutenção preventiva de veículos. O sistema conta com painéis gerenciais, mapas de acompanhamento em tempo real e controle de acessos (Gestor vs. Técnico).

> **Aviso de Origem:** Este projeto é um *fork* e uma evolução independente do repositório original desenvolvido para fins acadêmicos na FATEC. O projeto original pode ser encontrado aqui: [Bifrost-Connect/API3-BACK](https://github.com/Bifrost-Connect/API3-BACK).

---

## 🚀 Arquitetura do Projeto

Este repositório é um monorepo contendo tanto o cliente web (Front-End) quanto a API (Back-End).

### 🖥️ Front-End
Interface rica e responsiva focada na experiência do usuário (Mobile First) e gestores de frota.
- **Tecnologias:** React, Next.js (App Router), TypeScript, CSS Modular.
- **Mapas:** Leaflet e React-Leaflet com integração ao OSRM para roteamento e visualização de trajetos.
- **Estrutura:** Localizado na pasta `/Front-End`.

### ⚙️ Back-End
Motor de regras de negócio, autenticação JWT, integração com o banco de dados e auditorias.
- **Tecnologias:** Java 17+, Spring Boot, Spring Security.
- **Banco de Dados:** MySQL (com migrações Flyway).
- **Estrutura:** Localizado na pasta `/Back-End`.

---

## 🛠️ Funcionalidades Principais

1. **Painel de Controle (Dashboard):** Visão geral instantânea da frota, com KPIs e gráficos de atendimento.
2. **Mapa de Ocorrências:** Rastreio visual em tempo real dos chamados abertos e frotas em trânsito.
3. **Gestão de Veículos e Motoristas:** Cadastro completo (placa, Renavam) e histórico de manutenções.
4. **Viagens e Check-ins:** Controle de odômetro de saída (Check-out) e retorno (Check-in).
5. **Auditoria:** Registro estrito de log sobre quem modificou o que no sistema.

---

## 📦 Como Rodar o Projeto

### 1. Back-End (Spring Boot)
1. Certifique-se de ter o **Java 17** e o **Maven** instalados.
2. Tenha um servidor **MySQL** rodando.
3. Navegue até a pasta `Back-End` e edite o arquivo `application.properties` (ou `.env`) com as credenciais do seu banco.
4. Execute o projeto usando sua IDE ou via terminal:
   ```bash
   mvn spring-boot:run
   ```

### 2. Front-End (Next.js)
1. Certifique-se de ter o **Node.js** (v18+) e o **pnpm** instalados.
2. Navegue até a pasta `Front-End`.
3. Instale as dependências:
   ```bash
   pnpm install
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   pnpm run dev
   ```
5. Acesse `http://localhost:3000` no seu navegador.

---
**Ambiente de Demonstração:** Por padrão, a interface possui um banner com os dados de login de demonstração (admin / tecnico) para facilitar testes rápidos e navegação pelas telas.
