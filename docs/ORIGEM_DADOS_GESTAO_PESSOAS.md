# De onde vêm os dados da Gestão de Pessoas

## Resumo (atualizado)

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

---

## Por que às vezes não aparecem unidades / regras / e há duplicatas

1. **Unidades não aparecem**  
   A tela agrupa por **Unidade → Departamento → Cargo**. Se nenhum usuário tiver o campo **unit** preenchido no banco, a lista de unidades fica vazia e a interface cai no fallback “Exibindo por departamento”.  
   **Causa:** o seed que preenche `unit` (`seed_gestao_por_unidade.ts`) precisa rodar **depois** de `seed_users` no deploy. No build do Render a ordem é: `seed_users` → `seed_tools` → `seed_gestao_por_unidade` → `cleanup_duplicates`. Após o próximo deploy, as unidades devem aparecer. Em ambiente local, rode manualmente:  
   `npx tsx prisma/seed_gestao_por_unidade.ts`

2. **Departamentos/cargos não seguem a regra que você enviou**  
   A regra (nomes exatos de departamentos e cargos) está em `seed_gestao_por_unidade.ts`. Esse seed **apaga** todas as tabelas `Department` e `Role` e recria só com os nomes dessa lista; em seguida atualiza os usuários da lista com `unit`, `department` e `jobTitle`.  
   Se esse seed não rodar (ou rodar antes de ter usuários), ou se outro seed/`syncStructureFromUsers` tiver criado departamentos com outros nomes (ex.: “Tecnologia e Segurança” em vez de “Tecnologia e Segurança (SI)”), a tela não segue a regra.  
   **Solução:** garantir que `seed_gestao_por_unidade` rode no deploy (já está no `render.yaml`) e, localmente, rodar o mesmo comando acima.

3. **Usuários duplicados (mesmo nome, emails diferentes)**  
   Ex.: “Annelise Ribeiro de Souza” com `annelise.souza@grupo-3c.com` e `annelise.ribeiro.de.souza@grupo-3c.com`. Isso acontece quando a mesma pessoa entra no banco com dois emails (ex.: um no `seed_users` / lista oficial e outro em `seed.ts` ou em acessos de ferramentas). A API devolve **todos** os usuários; a tela lista todos, então a pessoa aparece duas vezes.  
   **Solução:** o script `cleanup_duplicates.ts` remove do banco qualquer usuário cujo email **não** está na lista oficial (`emailsOficiais`). Esse script foi incluído no build do Render após `seed_gestao_por_unidade`. Assim, após o deploy restam só os ~130 colaboradores da lista oficial, sem duplicatas por email. Em local, você pode rodar:  
   `npx tsx prisma/cleanup_duplicates.ts`
