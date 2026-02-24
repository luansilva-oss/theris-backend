# De onde vêm os dados da Gestão de Pessoas

## Resumo

- **Colaboradores**: vêm **só do banco de dados** (tabela `User`), via API `GET /api/users`.
- **Departamentos e cargos**: vêm do banco (tabelas `Department` e `Role`), via API `GET /api/structure`. Na subida do servidor, o backend também roda `syncStructureFromUsers()`, que **cria** departamentos e cargos a partir dos usuários que já têm `department` e `jobTitle` preenchidos.

Nenhum dado é lido de arquivos CSV ou da sua lista em tempo de execução: tudo depende do que foi gravado no banco pelos **seeds** (ou pela edição manual na tela).

---

## O que roda no deploy (produção)

No **render.yaml** o build executa:

```bash
npx tsx prisma/seed_users.ts && npx tsx prisma/seed_tools.ts
```

Ou seja, em produção só rodam **seed_users.ts** e **seed_tools.ts**.

### seed_users.ts

- Contém uma lista com **nome, email, cargo (jobTitle), departamento (department), gestor (managerEmail)**.
- **Não contém e não grava o campo unidade (unit)**.
- No `upsert` ele atualiza apenas: `name`, `jobTitle`, `department` (e `systemProfile` para admins). Por isso todos os usuários ficam com **unit = null** no banco.

### seed_tools.ts

- Popula ferramentas e acessos. Não mexe em usuários (unit/department/jobTitle).

---

## Onde está a lista completa (com unidade)

A lista que você enviou (todos os colaboradores com **unidade**, departamento e cargo) está em:

1. **prisma/seed_people_gestao.ts** – 130 colaboradores com nome, email, cargo, **unidade**, departamento, gestor (formato texto).
2. **prisma/seed_gestao_por_unidade.ts** – mesma estrutura por **Unidade → Departamento → Cargo**, com **unit**, department, jobTitle e faz upsert nos usuários.

Esses dois arquivos **não são executados** no build do Render. Por isso o banco em produção nunca recebe o campo **unit**, e a tela que agrupa por unidade fica vazia (ou cai no fallback “por departamento”).

---

## Por que a tela fica preta / sem unidades

1. O frontend chama `GET /api/users` e `GET /api/structure`.
2. Os usuários vêm com `unit: null` porque **seed_users.ts** não preenche `unit`.
3. O `PersonnelListView` monta a lista de unidades a partir de `user.unit`. Como ninguém tem `unit` preenchido, `units` fica vazio e a vista por unidade não mostra nada (por isso entramos o fallback “por departamento”).

---

## Como corrigir de forma definitiva

Para que a Gestão de Pessoas reflita **sua** lista (com unidade para todos):

**Opção A – Incluir o seed com unidade no deploy**

No **render.yaml**, após `seed_users.ts` e `seed_tools.ts`, rodar também o seed que preenche **unit** (e alinha departamento/cargo):

```bash
npx tsx prisma/seed_users.ts && npx tsx prisma/seed_tools.ts && npx tsx prisma/seed_gestao_por_unidade.ts
```

Assim, após cada deploy, os usuários passam a ter `unit`, `department` e `jobTitle` conforme a lista em `seed_gestao_por_unidade.ts`.

**Opção B – Adicionar `unit` no seed_users.ts**

- Incluir o campo **unit** em cada item da lista em `seed_users.ts`.
- No `upsert` de usuário, passar também `unit: u.unit` no `update` e no `create`.

Assim, o seed que já roda no deploy passa a popular a unidade, e a tela por unidade passa a ter dados sem precisar rodar outro seed.

---

## Fluxo dos dados (referência)

| Dado            | Fonte no backend                          | Quem popula no banco (hoje em produção)   |
|-----------------|-------------------------------------------|-------------------------------------------|
| Colaboradores   | `GET /api/users` → `prisma.user.findMany()` | `seed_users.ts` (sem `unit`)             |
| Departamentos   | `GET /api/structure` → `prisma.department.findMany()` | `syncStructureFromUsers()` + dados já nos usuários |
| Cargos          | `GET /api/structure` → `prisma.role.findMany()`       | Idem                                      |

O `syncStructureFromUsers()` roda na **subida do servidor** (`index.ts`) e cria Department/Role para cada `department`/`jobTitle` que existir nos usuários. Ou seja: a estrutura de departamentos e cargos depende do que está nos usuários; como hoje nenhum usuário tem `unit`, a vista por unidade não tem como aparecer sem usar o seed que preenche `unit`.
