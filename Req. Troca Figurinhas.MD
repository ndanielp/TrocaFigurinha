# Troca Figurinhas — Plataforma de Matching para Álbum da Copa

## Visão
Plataforma web (PWA mobile-first) que conecta colecionadores do álbum da Copa do Mundo FIFA 2026 para troca de figurinhas repetidas, priorizando matches bilaterais e proximidade geográfica.

## Problema
Colecionar o álbum sozinho é caro e ineficiente. Trocas presenciais ou via grupos de WhatsApp são desorganizadas: ninguém sabe quem tem o quê, distância é incerta, e identificar matches úteis exige conversas longas.

## Solução
Cada usuário cadastra (a) figurinhas que possui e (b) repetidas com quantidade. A plataforma calcula matches bilaterais ordenados por distância (CEP) e volume de troca possível, com contato facilitado via WhatsApp opcional.

## Funcionalidades — MVP

### Autenticação
- Login/senha ou com Google.
- Onboarding: nome de exibição, CEP, WhatsApp, opt-in para exibir WhatsApp em matches.

### Coleção
- Interface visual do álbum dividido por seleção/seção (32 seleções + especiais).
- Estado por figurinha: `não-tenho` | `tenho` | `repetida (qtd ≥ 1)`.
- Marcação rápida: tap = "tenho"; long-press / botão "+" = incrementa repetida.
- Bulk actions: "marcar seleção inteira como tenho", "limpar seleção".

### Matching (core)
- Algoritmo: para cada outro usuário `B`, calcular:
  - `eu_dou`: minhas repetidas que B precisa
  - `eu_recebo`: repetidas de B que eu preciso
  - `score_troca`: min(|eu_dou|, |eu_recebo|) — quantidade efetiva de troca bilateral
  - `distancia_km`: haversine entre centróides dos CEPs
- Ranking padrão: `score_troca DESC, distancia_km ASC`.
- Filtros: distância máxima (slider 5/10/25/50/100/200 km/qualquer), score mínimo.
- Matches unilaterais (eu só dou ou só recebo) ficam em aba separada, opcional.

### Painel do usuário
- Stats: % do álbum completo, total de repetidas, top 5 figurinhas mais "demandadas pela comunidade" entre minhas repetidas.
- Lista de matches (cards): foto/avatar do outro usuário, score, distância, prévia das figurinhas a trocar, botão "ver detalhe" e "contato WhatsApp" (se opt-in).

### Detalhe de match
- Listagem completa: o que eu dou ↔ o que eu recebo.
- Botão "abrir WhatsApp" (wa.me/) só aparece se ambos opt-in.

## Stack Técnica - Google Cloud

## Privacidade e LGPD

- **Endereço:** só CEP é armazenado. O usuário sabe disso desde o cadastro.
- **WhatsApp:** opt-in explícito, revelado só em matches reais (não público no perfil).
- **Direito ao esquecimento:** botão "excluir conta" remove `users/{uid}`, `collections/{uid}`, `matches/{uid}` e revoga sessões.
- **Termos e Política de Privacidade:** aceite obrigatório no onboarding.
- **Dados de menores:** o álbum atrai público infantojuvenil. Definir idade mínima (13 ou 16?) e tratar segundo o art. 14 da LGPD.
