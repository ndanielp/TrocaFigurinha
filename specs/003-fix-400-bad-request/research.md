# Research: Corrigir Erro 400 ao Abrir o Portal

**Phase 0 Output** | **Branch**: `003-fix-400-bad-request` | **Date**: 2026-05-29

## Investigação

### Diagnóstico via Cloud Run Logs

**Evidência coletada**:
```
STATUS  REQUEST_URL
400     https://trocafigurinhas-staging-.../
ERR_HTTP_HEADERS_SENT
  at async M (.next/server/app/_not-found/page.js:2:6948)
  at p (.next/server/app/_not-found/page.js:2:4784)
```

O 400 ocorria em toda requisição à raiz `/`. O erro `ERR_HTTP_HEADERS_SENT` indica que algo tentou escrever headers depois que a resposta já havia sido iniciada.

### Causa Raiz

**Decisão**: O middleware chamava `await auth()` diretamente dentro de uma função middleware customizada.

**Rationale**: No NextAuth v5, `auth()` chamada sem argumentos em contexto de Server Component retorna a sessão lendo os cookies da requisição. No entanto, quando chamada dentro de um middleware, o NextAuth v5 também precisa atualizar cookies de sessão na resposta (ex: renovar session token). Como o middleware já havia iniciado seu próprio ciclo de resposta (`NextResponse.next()`), o NextAuth tentava definir headers em uma resposta já comprometida — resultando em `ERR_HTTP_HEADERS_SENT` e status 400.

**Alternativas consideradas**:

| Alternativa | Por que rejeitada |
|---|---|
| Usar JWT strategy em vez de database sessions | Mudança de escopo maior; afeta a feature 002; não resolve o padrão de chamada |
| Mover verificação de auth para cada page/layout | Duplicaria lógica de redirecionamento em todas as rotas protegidas |
| Continuar com `await auth()` e suprimir erros | Não resolve o conflito de headers; comportamento imprevisível |

### Padrão Correto: `auth(handler)`

**Decisão**: Envolver o middleware com `auth(fn)` usando o padrão recomendado pelo NextAuth v5.

**Rationale**: Este padrão delega o gerenciamento do ciclo de resposta ao NextAuth, que escreve cookies e lida com CSRF de forma coordenada antes de chamar o handler customizado. A sessão fica disponível via `req.auth` sem conflitos de headers.

```ts
// ANTES (quebrado):
export default async function middleware(req: NextRequest) {
  const session = await auth(); // NextAuth tenta escrever na resposta aqui
  // ...
}

// DEPOIS (correto):
export default auth(function middleware(req) {
  const session = req.auth; // sessão já disponível, sem chamadas externas
  // ...
});
```

**Alternativas consideradas**:

| Alternativa | Por que rejeitada |
|---|---|
| `export { auth as middleware }` (sem handler customizado) | Não permite lógica de redirecionamento por `accountStatus` |
| Passar `req` explicitamente: `auth(req)` | Não é o padrão suportado para uso em middleware; `auth(handler)` é o correto |

## Configuração de Ambiente

**Decisão**: Manter `AUTH_URL`, `NEXTAUTH_URL` e `AUTH_SECRET` como estão no staging. Nenhuma variável adicional necessária.

**Rationale**: O fix é puramente de código. As variáveis de ambiente já estavam corretas no staging (confirmado via `gcloud run services describe`).

## Validação

**Decisão**: Verificação manual nos logs do Cloud Run após deploy (única vez), conforme SC-004.

**Rationale**: Fix pontual de um bug bem delimitado; overhead de automação de testes para este caso seria desproporcional ao risco.
