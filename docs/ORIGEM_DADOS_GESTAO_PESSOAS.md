# De onde vêm os dados da Gestão de Pessoas

## Resumo

- **Estrutura (Unidades, Departamentos, Cargos)**: vêm **só** do banco, via `GET /api/structure`. Quem popula é o **seed_units.ts** no deploy. Não há criação automática de estrutura na subida do servidor.
- **Colaboradores**: vêm do banco (tabela `User`), via `GET /api/users`. Quem preenche **unit**, **department** e **jobTitle** é o **seed_gestao_por_unidade.ts** no deploy.

A tela mostra **exatamente** o que está no banco: árvore Unidade → Departamento → Cargo e, em cada cargo, os usuários cujo `user.unit`, `user.department` e `user.jobTitle` batem com esse nó. Não há “Geral”, nem fallback “por departamento”.

---

## O que roda no deploy (produção)

No **render.yaml** o build executa, nesta ordem:

```bash
npx tsx prisma/seed_users.ts
npx tsx prisma/seed_tools.ts
npx tsx prisma/seed_units.ts
npx tsx prisma/seed_gestao_por_unidade.ts
npx tsx prisma/cleanup_duplicates.ts
```

- **seed_users.ts**: cria/atualiza usuários (nome, email, jobTitle, department, gestor). Não preenche `unit`.
- **seed_tools.ts**: ferramentas e acessos.
- **seed_units.ts**: apaga Unit, Department, Role e recria a estrutura das **6 unidades** (3C+, Evolux, Dizify, Instituto 3C, FiqOn, Dizparos) com departamentos e cargos conforme a lista oficial.
- **seed_gestao_por_unidade.ts**: atualiza cada usuário da lista com `unit`, `department` e `jobTitle` (por email). Cria usuário se não existir.
- **cleanup_duplicates.ts**: remove usuários cujo email não está na lista oficial, evitando duplicatas.

Após o deploy, a tela de Gestão de Pessoas reflete essa estrutura e só esses colaboradores na árvore.

---

## Fonte única: por que “só isso” na tela

A tela **não** inventa unidades a partir dos usuários nem mostra “Geral” ou “por departamento” quando não há unidades. Ela usa só:

1. **Estrutura** retornada por `GET /api/structure` (units com departments e roles).
2. **Usuários** retornados por `GET /api/users`.

Em cada cargo da árvore aparecem apenas os usuários em que `user.unit`, `user.department` e `user.jobTitle` coincidem com aquele nó. Quem está fora da lista (unit/department/jobTitle não preenchidos ou diferentes) não aparece na árvore. Assim não há “colaboradores a mais” nem estrutura errada: o que você definiu nos seeds é o que aparece.

---

## Atualização automática quando houver solicitações

Quando existir fluxo de **solicitações** (admissão, demissão, promoção, movimentação), para a Gestão de Pessoas refletir automaticamente:

- Ao **aprovar** uma solicitação que altera unidade/departamento/cargo, o backend deve:
  - **Atualizar** `User`: `unit`, `department`, `jobTitle` conforme a solicitação.
  - Se a solicitação criar um **novo** departamento ou cargo, criar o `Department`/`Role` correspondente (ou garantir que já existam no seed e só atualizar o usuário).

Ou seja: a mesma fonte de verdade (User + Unit/Department/Role no banco) é atualizada pelos seeds no deploy e, no futuro, pelos fluxos de solicitações. A tela só lê essa fonte e exibe a árvore.

---

## Por que às vezes a estrutura parece errada ou com gente a mais

1. **“Estrutura não carregada”**  
   Significa que `GET /api/structure` retornou 0 unidades (ex.: banco novo sem rodar seeds). No deploy, depois de rodar `seed_units` e `seed_gestao_por_unidade`, as 6 unidades aparecem.

2. **Departamentos/cargos diferentes da lista**  
   A regra está em **seed_units.ts** (estrutura) e **seed_gestao_por_unidade.ts** (pessoas). Se esses seeds não rodarem no deploy ou rodarem em ordem errada, a estrutura ou os vínculos dos usuários ficam desatualizados. A ordem correta é: `seed_users` → `seed_tools` → `seed_units` → `seed_gestao_por_unidade`.

3. **Colaboradores a mais / duplicatas**  
   A API `/api/users` devolve todos os usuários do banco. A **árvore** só mostra quem tem `unit` + `department` + `jobTitle` batendo com a estrutura. Usuários sem `unit` (ex.: criados só pelo seed_users) não entram na árvore. Duplicatas por email são tratadas pelo `cleanup_duplicates.ts` no deploy.

---

## Fluxo dos dados (referência)

| Dado            | Fonte no backend | Quem popula no banco |
|-----------------|------------------|----------------------|
| Unidades        | `GET /api/structure` → `prisma.unit.findMany()` | **seed_units.ts** |
| Departamentos   | Idem (dentro de units) | **seed_units.ts** |
| Cargos (roles)  | Idem (dentro de departments) | **seed_units.ts** |
| Colaboradores   | `GET /api/users` → `prisma.user.findMany()` | **seed_users.ts** + **seed_gestao_por_unidade.ts** (unit, department, jobTitle) |

O `syncStructureFromUsers()` roda na subida do servidor mas **não cria** nenhuma Unit/Department/Role quando não existir nenhuma unidade no banco; a estrutura vem apenas dos seeds.
