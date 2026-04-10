# EstudoIA Kids

Sistema web full-stack, responsivo e mobile-first para estudo fora da escola, lições de casa e preparação para provas.

## Stack
- Frontend: React + Vite + TypeScript + Chart.js + Mermaid + React Dropzone
- Backend: Node.js + Express + TypeScript + Prisma + JWT + Redis cache
- Banco: PostgreSQL
- IA: OpenAI (GPT-4o-mini, embeddings, geração de imagem) com fallback para Groq Llama3

## Funcionalidades implementadas
- Cadastro/Login de responsável com validação de CPF brasileiro
- Gestão de crianças (5-18 anos), ano escolar, matérias e hobbies
- Compartilhamento de acesso para múltiplos responsáveis (co-responsável)
- Upload drag-and-drop de PDF/JPG/PNG/DOCX
- OCR e extração de texto
- IA gera resumo infantil, guia detalhado, fluxograma Mermaid, imagem e complexidade
- Botão "Mais Detalhes" com aprofundamento, referências e mini quiz
- Geração de testes (5-50 questões), modo cego, correção e explicações
- Recomendações personalizadas com embeddings
- Histórico com progressão e métricas (Chart.js)
- Fallback para conteúdo sem texto e indisponibilidade de IA

## Hardening aplicado
- Headers de segurança HTTP (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`)
- Request ID e logging estruturado por requisição
- Rate limit em endpoints de autenticação
- Health check com status de banco e cache
- Teste automatizado inicial de validação de CPF

## Estrutura
- `apps/api`: API + Prisma
- `apps/web`: aplicação React

## Como rodar
1. Copie variáveis:
   - `.env.example` para `.env`
   - `apps/api/.env.example` para `apps/api/.env`
   - `apps/web/.env.example` para `apps/web/.env`
2. Suba infraestrutura:
   - `docker compose up -d`
3. Instale dependências:
   - `npm install`
4. Gere cliente e migração Prisma:
   - `npm --workspace apps/api run prisma:generate`
   - `npm --workspace apps/api run prisma:migrate`
5. Rode em desenvolvimento:
   - `npm run dev`
6. Testes:
   - `npm --workspace apps/api run test`

## Fluxo das telas
1. Login/Cadastro responsável
2. Dashboard com crianças + adicionar/editar
3. Tela da criança com seletor de matéria + upload/processar
4. Pós-processamento em abas: Resumo | Guia | Teste | Aprenda+
5. Histórico com gráficos e evolução

## Observações importantes do ambiente
- Se `docker` não estiver instalado, use PostgreSQL/Redis gerenciados (Neon/Supabase + Upstash) e ajuste `.env`.
- Se houver bloqueio TLS com npm no Windows corporativo, habilite CA de sistema no shell antes do install:
  - PowerShell: `$env:NODE_OPTIONS='--use-system-ca'`