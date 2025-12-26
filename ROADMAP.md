# 🗺️ Lectorium Masterplan (Project Jarvis)

Este documento rastreia o progresso da implementação do Workspace Acadêmico Local-First.
**Status:** 🏗️ Em Construção
**Arquitetura:** Local-First (IndexedDB + React Query), React 19, Google GenAI.

---

##  Fase 1: Infraestrutura & Core (Data Layer)
O objetivo é estabelecer a persistência de dados local robusta antes de construir a UI.

- [ ] **1.1. Atualização de Dependências (ImportMap)**
    - Adicionar bibliotecas necessárias no `index.html`: `tiptap`, `pdfjs-dist`, `mammoth` (para docx), `jszip`.
- [ ] **1.2. Camada de Persistência (Lectorium DB)**
    - Criar `services/lectoriumDb.ts` usando `idb-keyval` ou `dexie`.
    - Definir schemas para: `Documents` (Metadados), `DocumentContent` (Blob/JSON pesado), `Vectors` (Embeddings para RAG local).
- [ ] **1.3. Service Worker & PWA Config**
    - Otimizar `vite.config.ts` e configurações do Workbox para cache agressivo de assets do editor e PDF worker.

## Fase 2: O Shell do Workspace (UI/UX)
Criar a interface imersiva e livre de distrações.

- [ ] **2.1. Rota e Layout do Lectorium**
    - Criar `components/lectorium/LectoriumLayout.tsx`.
    - Implementar Sidebar de arquivos (File Tree) local.
- [ ] **2.2. Gerenciador de Arquivos (Local)**
    - Implementar CRUD de pastas e arquivos virtuais no IndexedDB.
    - Importação de arquivos locais (Drag & Drop).

## Fase 3: Editor Acadêmico (Tiptap v2)
O coração da escrita. Deve suportar normas ABNT e performance em textos longos.

- [ ] **3.1. Setup do Tiptap**
    - Criar `components/lectorium/editor/AcademicEditor.tsx`.
    - Configurar extensões básicas (StarterKit, Typography).
- [ ] **3.2. Extensões ABNT Customizadas**
    - Citações (Recuo de 4cm).
    - Referências bibliográficas automáticas.
- [ ] **3.3. Persistência em Tempo Real**
    - Salvar conteúdo no IDB a cada keystroke (debounced) sem bloquear a main thread.

## Fase 4: Leitor Neural de PDF & Processamento
Processamento de PDFs pesados via Web Workers para não travar a UI.

- [ ] **4.1. PDF Worker Setup**
    - Criar `workers/pdfWorker.ts` para parsing de texto e renderização de thumbnails.
- [ ] **4.2. Visualizador de PDF (Split View)**
    - Criar `components/lectorium/pdf/PDFReader.tsx`.
    - Implementar seleção de texto e highlight.
- [ ] **4.3. Extração de Texto para Contexto**
    - Extrair texto do PDF e preparar chunks para a IA.

## Fase 5: Integração GenAI (O "Cérebro")
Integração profunda com o SDK `@google/genai`.

- [ ] **5.1. Hook de IA (`useLectoriumAI`)**
    - Abstração do cliente `GoogleGenAI`.
    - Gerenciamento de streaming de respostas.
- [ ] **5.2. Chat Contextual (RAG Lite)**
    - "Converse com seu PDF". Enviar chunks do texto visível ou selecionado para o Gemini 2.5 Flash.
- [ ] **5.3. Ferramentas de Escrita**
    - Comandos `/ai` no editor para: Resumir, Parafrasear (Tom Acadêmico), Expandir Tópico.

## Fase 6: Exportação & Sincronização
Garantir que o dado não morra no navegador.

- [ ] **6.1. Exportação DOCX**
    - Criar `services/docxExportService.ts` para converter JSON do Tiptap em .docx formatado.
- [ ] **6.2. Sincronização em Background (Opcional/Fase Final)**
    - Sync com Google Drive ou Firebase Storage quando online.

---

## 🛠️ Log de Alterações
*Nenhum item concluído ainda.*
