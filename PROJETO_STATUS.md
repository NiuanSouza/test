# Estado de Continuação do Projeto (SIVA)

Este documento registra o estado atual do projeto SIVA (Sistema de Controle de Viaturas) para guiar o próximo desenvolvedor ou assistente de IA na retomada do trabalho.

---

## 🚀 Status do Projeto

O projeto é dividido em **Back-End** (Spring Boot, Java 21, Flyway, Hibernate/Envers) e **Front-End** (Next.js, React, CSS Vanilla).

Recentemente, reestruturamos várias partes da aplicação para aderir ao novo padrão visual premium (azul profundo `#002080` → `#0d36b1`, layout integrado de mapa e cards, padronização de botões e badges).

### ✅ O que foi concluído recentemente:
1. **Banco de Dados (Flyway):**
   - Criação da migração `V5__add_service_types.sql` adicionando `service_type` e `cnh_type` na tabela `service`.
2. **Back-End (Java):**
   - Atualização do modelo [Service.java](file:///home/niuan/Projetos/test/Back-End/src/main/java/com/ipem/api/modules/service/model/Service.java) com `serviceType` e `cnhType`.
   - Adaptação do [ServiceService.java](file:///home/niuan/Projetos/test/Back-End/src/main/java/com/ipem/api/modules/service/service/ServiceService.java) para salvar o tipo de serviço, cnh, e associar o técnico correto no banco de dados.
3. **Gestão de Chamados (Mapa Gestor):**
   - Layout do [MapGestor.tsx](file:///home/niuan/Projetos/test/Front-End/src/components/maps/MapGestor.tsx) reformulado: o mapa agora fica no topo em largura total, e a criação/lista de chamados fica na parte inferior.
   - O `<select>` de técnicos busca dinamicamente da API `/user/technicians/active` em vez de dados mockados.
   - CSS portador atualizado em [mapa-gestor.css](file:///home/niuan/Projetos/test/Front-End/src/app/(app)/service-requests/mapa-gestor.css).
4. **Dashboard Inicial (`/dashboard`):**
   - Reescrito em Next.js [page.tsx](file:///home/niuan/Projetos/test/Front-End/src/app/(app)/dashboard/page.tsx) com 8 cards de KPIs dinâmicos e histórico com os 5 últimos logs de auditoria (Envers).
   - Estilização em [dashboard-gestor.css](file:///home/niuan/Projetos/test/Front-End/src/app/(app)/dashboard/dashboard-gestor.css).
5. **Histórico Completo (`/history`):**
   - Reescrito em Next.js [page.tsx](file:///home/niuan/Projetos/test/Front-End/src/app/(app)/history/page.tsx) com timeline dinâmica detalhada de abastecimentos (Refueling), incidentes e check-ins/outs.
   - Estilização em [historico.css](file:///home/niuan/Projetos/test/Front-End/src/app/(app)/history/historico.css).

---

## 🛠️ Próximo Passo Pendente: Migrar a Tela de Relatórios (`/reports`)

O usuário solicitou a migração da tela de **Relatórios** antiga (HTML/JS) para o Next.js. O código foi fornecido, mas a migração **não foi iniciada**.

### 📋 O que deve ser feito a seguir:

1. **Criar a nova interface do Next.js:**
   - Modificar o arquivo [page.tsx](file:///home/niuan/Projetos/test/Front-End/src/app/(app)/reports/page.tsx).
   - Portar a lógica do HTML/JS fornecido pelo usuário (onde se escolhe a categoria: *Chamados*, *Abastecimento*, e exibe as respectivas tabelas e KPIs).

2. **Estilização:**
   - Criar um arquivo `relatorios.css` na pasta `Front-End/src/app/(app)/reports/` utilizando o CSS fornecido pelo usuário.
   - Importá-lo no `page.tsx` de relatórios.

3. **Integração com a API de Relatórios:**
   - Consumir o endpoint `/dashboard/reports` ao carregar a tela para alimentar as opções do ano/mês vigente e os relatórios mensais cadastrados no banco.
   - Ao selecionar a categoria (Chamados ou Abastecimento), buscar no endpoint correspondente por período (passando `startDate` e `endDate` em formato `yyyy-MM-dd`):
     - **Chamados:** `GET /dashboard/reports-by-date?startDate=...&endDate=...`
     - **Abastecimento:** `GET /dashboard/supplies-by-date?startDate=...&endDate=...`
   - O popup "Escolher datas" deve permitir ao usuário customizar a busca.

4. **Lógica de Exportação:**
   - O popup de exportação deve acionar os endpoints do [ExportController.java](file:///home/niuan/Projetos/test/Back-End/src/main/java/com/ipem/api/modules/export/controller/ExportController.java):
     - `GET /export/{format}/{recurso}/{fileName}?startDate=...&endDate=...`
     - Formato: `csv`, `pdf` ou `excel`.
     - Recurso: `reports-by-date` para chamados, ou `supplies-by-date` para abastecimentos.
     - Utilizar o método helper `baixarArquivo` ou implementar no cliente Next.js o download do blob de dados binários do endpoint.

---

## 🔍 Dicas para o Backend
- A aplicação backend roda em **Java 21**. Para compilar localmente pela linha de comando, certifique-se de que o JDK no PATH esteja na versão 21, ou execute/depure diretamente pela IDE (como IntelliJ).
- O Flyway rodará as migrações automaticamente no boot da aplicação se configurado corretamente.
