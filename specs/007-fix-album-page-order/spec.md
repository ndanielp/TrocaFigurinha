# Feature Specification: Ordem do Álbum por Páginas (Referência Oficial)

**Feature Branch**: `007-fix-album-page-order`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Quero que o álbum seja organizado como em Modelos/album_copa_2026.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Álbum na ordem exata de páginas do álbum físico (Priority: P1)

O usuário abre o álbum e navega por ele na mesma ordem do álbum físico oficial: as figurinhas de abertura da Copa (FWC00–FWC08) aparecem primeiro, seguidas pelos times nos grupos A–L (2 páginas por time), depois as figurinhas de história da Copa (FWC09–FWC19) e por último as figurinhas Coca-Cola. Isso corresponde às 99 páginas do álbum real.

**Why this priority**: O propósito central do produto é o usuário controlar sua coleção do álbum físico. Se a ordem no app não bater com o álbum em mãos, o usuário não consegue localizar as figurinhas.

**Independent Test**: Abrir o álbum no app e conferir que a primeira seção exibe as figurinhas FWC00–FWC08 (página 1 do álbum físico), seguido pelo Grupo A (México, África do Sul, Coreia do Sul, Rep. Tcheca), e que FWC09–FWC19 aparecem apenas depois de todos os 48 times (correspondendo à página 98 do álbum físico).

**Acceptance Scenarios**:

1. **Given** o álbum carregado, **When** o usuário visualiza a primeira seção, **Then** vê as figurinhas FWC00 a FWC08 (introdução da Copa).
2. **Given** o álbum carregado, **When** o usuário percorre os times, **Then** os grupos A–L aparecem nessa ordem, com os 4 times de cada grupo em sequência.
3. **Given** o álbum carregado, **When** o usuário chega ao final dos times, **Then** encontra as figurinhas FWC09–FWC19 (história da Copa), seguidas das figurinhas Coca-Cola.
4. **Given** a seção de qualquer time (ex.: México), **When** exibida, **Then** as figurinhas aparecem na ordem numérica correta (01, 02, 03, … 20).

### Edge Cases

- As figurinhas FWC aparecem em duas seções distintas (abertura e história); não devem ser agrupadas juntas.
- A numeração das figurinhas de time deve ser consistente com o álbum físico (01 a 20).
- Figurinhas Coca-Cola (CC) são a última seção do álbum, após as FWC de história.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O álbum MUST exibir as figurinhas FWC00–FWC08 como a primeira seção (abertura).
- **FR-002**: O álbum MUST exibir as seleções nos grupos A–L em sequência, logo após a abertura.
- **FR-003**: O álbum MUST exibir as figurinhas FWC09–FWC19 como seção de história, após todos os times.
- **FR-004**: O álbum MUST exibir as figurinhas Coca-Cola (CC) como última seção, após o FWC de história.
- **FR-005**: Dentro de cada seção de time, as figurinhas MUST aparecer em ordem numérica (01 a 20).
- **FR-006**: A ordem do álbum MUST corresponder página a página ao documento de referência `Modelos/album_copa_2026.md`.

### Key Entities

- **Figurinha (catálogo)**: item do álbum. Atributo relevante: posição global no álbum (ordem de exibição) derivada da sequência de páginas do álbum físico.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das seções do álbum no app aparecem na mesma ordem das 99 páginas do álbum físico de referência.
- **SC-002**: As figurinhas FWC de abertura (FWC00–FWC08) aparecem antes de qualquer seleção nacional.
- **SC-003**: As figurinhas FWC de história (FWC09–FWC19) aparecem depois de todas as seleções nacionais e antes das Coca-Cola.

## Assumptions

- O documento `Modelos/album_copa_2026.md` é a fonte de verdade para a ordem das 99 páginas.
- A estrutura de dados existente (coluna de ordenação) já suporta esta mudança — apenas os valores de ordenação precisam ser corrigidos para refletir a estrutura real de páginas.
- Dados de marcação de figurinhas dos usuários em staging podem ser afetados se houver recriação do catálogo; em produção, uma migração cuidadosa será necessária.
