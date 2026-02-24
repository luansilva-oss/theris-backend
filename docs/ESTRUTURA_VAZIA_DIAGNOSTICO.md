# Por que "Estrutura não carregada" — mapa de possibilidades

Quando a tela **Gestão de Pessoas** mostra "Estrutura não carregada..." e não exibe unidades/departamentos/cargos/colaboradores, o fluxo é:

1. O front chama `GET ${API_URL}/api/structure`.
2. O backend responde `{ units: [...] }`.
3. O front define `units` com esse array e o `PersonnelListView` filtra "Geral" e monta a lista; se `unitList.length === 0`, mostra a mensagem.

**Possíveis causas (por ordem de verificação):**

---

## 1. API_URL vazio em produção (causa mais comum)

**Onde:** Frontend — `src/config.ts` (e antes: `API_URL` definido como `''` quando não é localhost).

**O que acontece:** Em produção (ex.: theris.grupo-3c.com), se `VITE_API_URL` não for definido no build, `API_URL` fica `''`. O `fetch` vira `fetch('/api/structure')`, ou seja, pedido para o **próprio domínio do front** (Vercel, etc.). Não existe `/api/structure` no front → 404 ou erro → `resDepts.ok` é false → `setUnits` nunca é chamado → `units` continua `[]` → "Estrutura não carregada".

**Solução:** Definir **VITE_API_URL** no ambiente de build do front (Vercel, Netlify, etc.) com a URL do backend, ex.: `https://theris-backend.onrender.com`. Fazer novo deploy para o build incluir essa variável. O código em `src/config.ts` já usa `import.meta.env.VITE_API_URL` quando existir.

---

## 2. Backend retorna 200 mas `units: []`

**Onde:** Banco de dados — tabela `Unit` vazia.

**O que acontece:** O `structureController.getStructure` faz `prisma.unit.findMany(...)`. Se nenhum seed rodou nesse banco, o array é vazio e a API devolve `{ units: [] }`. O front recebe ok mas `unitList.length === 0` → mesma mensagem.

**Solução:** No **mesmo** ambiente onde o backend está rodando (mesmo `DATABASE_URL`), executar os seeds na ordem: `npx tsx prisma/seed_units.ts` e depois `npx tsx prisma/seed_gestao_por_unidade.ts`. No Render, isso já está no `buildCommand` do `render.yaml`; após o deploy o banco fica populado.

---

## 3. Front e back em ambientes diferentes

**Onde:** Deploy / configuração.

**O que acontece:** O front (ex.: Vercel) está configurado com `VITE_API_URL` apontando para um backend (ex.: Render), mas você rodou os seeds **localmente** contra outro banco. O banco que o backend em produção usa continua vazio.

**Solução:** Garantir que os seeds rodem no **mesmo** banco que o backend em produção usa (build no Render já faz isso). Ou rodar os seeds manualmente contra a `DATABASE_URL` de produção (com cuidado).

---

## 4. CORS ou rede

**Onde:** Browser / rede.

**O que acontece:** O pedido a `https://theris-backend.onrender.com/api/structure` é bloqueado por CORS ou falha de rede. O front não recebe 200 e não atualiza `units`.

**Solução:** No DevTools → Network, ver se o pedido a `/api/structure` existe, qual a URL completa e o status. Se for CORS, o backend precisa permitir a origem do front (ex.: `theris.grupo-3c.com`) no Express.

---

## 5. Resposta da API com formato errado

**Onde:** Backend — `structureController.getStructure`.

**O que acontece:** A API devolve algo que não é `{ units: Unit[] }` (ex.: `{ departments: [...] }` ou campo com outro nome). O front usa `structData.units || []` e continua com array vazio.

**Solução:** O controller já retorna `res.json({ units: data })`. Se alguém alterar para outro formato, o front (App.tsx e PersonnelListView) precisa continuar recebendo `units`.

---

## 6. Filtro "Geral" deixa a lista vazia

**Onde:** Frontend — `PersonnelListView.tsx`, `unitList` useMemo.

**O que acontece:** A API devolve unidades mas **todas** têm `name === 'Geral'`. O front filtra "Geral" e sobra `list.length === 0` → "Estrutura não carregada".

**Solução:** Não criar unidade "Geral" no backend (o `structureSync` já não cria). Se o banco tiver só "Geral", rodar `seed_units` para criar as 6 unidades reais.

---

## Resumo do fluxo no código

| Etapa | Arquivo | O que verificar |
|-------|---------|------------------|
| URL da API | `src/config.ts` | `API_URL` em produção = `VITE_API_URL` (definir no deploy) |
| Chamada | `App.tsx` (loadData) | `fetch(\`${API_URL}/api/structure\`)` — conferir no Network a URL real |
| Resposta | `App.tsx` | `structData.units || []` — resposta deve ter `units` |
| Estado | `App.tsx` | `setUnits(unitList)` só roda se `resDepts.ok` |
| Render | `PersonnelListView.tsx` | `unitsFromApi` → filtra "Geral" → `unitList`; se vazio, mostra a mensagem |
| Backend | `structureController.ts` | `getStructure` → `prisma.unit.findMany` + include → `res.json({ units: data })` |
| Dados | Banco | Tabela `Unit` com linhas (seed_units) |

Para diagnosticar: abrir DevTools → Network, recarregar com a aba Gestão de Pessoas aberta, localizar o pedido a `structure` e ver a **URL** (deve ser do backend), o **status** (200) e o **body** (deve ter `units: [ ... ]` com dados).
