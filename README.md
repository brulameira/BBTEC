# BBtec - Sistema de Controle de Estoque

> Projeto de extensão - BBtec: TADS, Desenvolvimento Web 1 e IFSP - Campinas

O **BBtec** é um sistema web de controle de estoque criado para ajudar **pequenas e médias empresas** a organizar seus produtos. Com ele, o usuário cadastra estoques, controla produtos (preço, quantidade, validade e fornecedor) e recebe **alertas automáticos** quando um produto está com estoque baixo ou perto do vencimento.

🔗 **Site publicado:** COLE_AQUI_A_URL_DA_HOSPEDAGEM

---

## Sumário

- [Equipe de desenvolvimento](#equipe-de-desenvolvimento)
- [Problema e objetivo](#problema-e-objetivo)
- [Funcionalidades](#funcionalidades)
- [Telas do sistema](#telas-do-sistema)
- [Tecnologias](#tecnologias)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Banco de dados](#banco-de-dados)
- [Regras dos alertas](#regras-dos-alertas)
- [Identidade visual e acessibilidade](#identidade-visual-e-acessibilidade)
- [Como rodar o projeto](#como-rodar-o-projeto)
- [Publicação](#publicação)
- [Fluxo de trabalho da equipe](#fluxo-de-trabalho-da-equipe)
- [Próximos passos](#próximos-passos)

---

## Equipe de desenvolvimento

| Nome | GitHub | Responsabilidades |
|------|--------|-------------------|
| Bruna Cristina | [@brulameira](https://github.com/usuario) | Tela do usuário: estoques, produtos e alertas |
| Bianca Santos  | [@biasanttz](https://github.com/biasanttz) | Tela Inicial, Tela de Cadastro |
| COLE_AQUI | [lyhan32](https://github.com/lyhan32) | Tela de Login, HTML, CSS |

## Problema e objetivo

Muitos pequenos negócios controlam o estoque em cadernos ou planilhas soltas. Isso causa falta de produtos, perdas por validade vencida e falta de visão geral do que existe em cada estoque.

O BBtec propõe uma interface **simples, organizada e intuitiva** para:

- centralizar vários estoques em um só lugar;
- manter os dados de cada produto e de seu fornecedor;
- avisar o usuário antes que o problema aconteça.

## Funcionalidades

**Estoques**
- Listar os estoques em cartões, com foto, situação (ativo ou desativado) e quantidade de alertas.
- Buscar por nome, filtrar (todos, ativos, desativados) e paginar.
- Criar, editar e excluir estoque, com foto enviada do computador ou link de imagem.

**Produtos** (planilha de cada estoque)
- Tabela com nome, código, preço, validade e quantidade.
- Cadastrar produto com todas as informações: nome, código, preço, validade, quantidade, fornecedor e endereço do fornecedor.
- Ao clicar no produto: ver os detalhes, editar ou excluir (com confirmação).
- Busca por nome ou código e validação dos campos (por exemplo, não permite código repetido).

**Alertas**
- Avisos de **estoque baixo** (ou sem estoque) e de **validade próxima** (ou produto vencido).
- Filtro por tipo de alerta.
- Botão "Ver Detalhes" que abre direto o produto em questão.
- Selo com o número de alertas no menu e contagem em cada cartão de estoque.

## Telas do sistema

| Tela | Arquivo | Descrição |
|------|---------|-----------|
| Início | `index.html` | Apresentação do sistema |
| Login | `html/login.html` | Acesso à conta |
| Estoques | `html/estoque.html` | Lista de estoques do usuário |
| Produtos | `html/produtos.html` | Planilha de produtos de um estoque |
| Alertas | `html/alertas.html` | Avisos de estoque baixo e validade |

> Os protótipos das telas foram feitos no Canva e estão descritos no Guia Visual do projeto.
> Tela de Estoque - Prototipo.
<img width="683" height="434" alt="{4DE67BF6-B93B-478A-8FC4-79901E1859C9}" src="https://github.com/user-attachments/assets/01dc3c30-1ba9-4513-a682-cc930fe65c12" />

> Tela de Alertas - Prototipo.
<img width="677" height="427" alt="{C364F024-487A-4A5B-B8F9-ED15EE9B6494}" src="https://github.com/user-attachments/assets/9f0974b4-ab74-497d-a0ba-b721b601fa88" />

## Tecnologias

- **HTML5, CSS3 e JavaScript** (módulos ES), sem frameworks.
- **Firebase Firestore**: banco de dados NoSQL que guarda os dados em formato JSON.
- **Firebase Hosting**: hospedagem do site em URL pública.
- **Google Fonts**: fonte Poppins.
- **Git e GitHub**: versionamento e trabalho em equipe.

## Estrutura de pastas

```
BBTEC/
├── index.html              # Tela inicial
├── html/                   # Telas do sistema
│   ├── login.html
│   ├── estoque.html
│   ├── produtos.html
│   └── alertas.html
├── css/                    # Estilos de cada tela
│   ├── style.css
│   ├── login.css
│   ├── estoque.css
│   ├── produtos.css
│   └── alertas.css
├── js/                     # Lógica das telas e do Firebase
│   ├── firebase-config.js  # Configuração do projeto Firebase
│   ├── regras-alertas.js   # Regras compartilhadas dos alertas
│   ├── estoque.js
│   ├── produtos.js
│   └── alertas.js
├── img/                    # Logo e imagens
└── README.md
```

## Banco de dados

Os dados ficam no **Firestore**, em formato JSON, em duas coleções:

```
estoques (coleção)
└── {idDoEstoque} (documento)
    ├── nome: "Produtos de Limpeza"
    ├── status: "ativo" | "desativado"
    ├── imagem: "https://..." ou imagem em texto (data URL)
    ├── criadoEm: timestamp
    └── produtos (subcoleção)
        └── {idDoProduto} (documento)
            ├── nome: "Detergente"
            ├── codigo: "DET-001"
            ├── preco: 13.00
            ├── quantidade: 10
            ├── validade: "2026-12-10"
            ├── fornecedor: "Distribuidora Limpa Bem"
            └── endereco: "Rua Exemplo, 100, Centro"
```

## Regras dos alertas

As regras ficam em `js/regras-alertas.js` e valem para a tela de estoques e a de alertas:

| Alerta | Quando acontece |
|--------|-----------------|
| Estoque baixo | quantidade igual ou menor que **5** unidades |
| Sem estoque | quantidade igual a **0** |
| Próximo do vencimento | validade em até **7 dias** |
| Produto vencido | validade anterior à data de hoje |

Estoques **desativados** não geram alertas.

## Identidade visual e acessibilidade

O visual segue o **Guia Visual do BBtec**: azul `#4F46E5` e laranja `#F4511E` como cores principais, fonte **Poppins**, botões arredondados e menu lateral laranja.

Cuidados de acessibilidade:
- bom contraste entre texto e fundo;
- rótulos visíveis acima dos campos;
- mensagens de erro com **texto**, nunca só cor;
- navegação por teclado com indicação visual de foco;
- respeito à preferência de reduzir animações.

## Como rodar o projeto

1. Clone o repositório:
   ```bash
   git clone https://github.com/COLE_AQUI/BBTEC.git
   ```
2. Crie um projeto no [Firebase Console](https://console.firebase.google.com), ative o **Firestore** e registre um app **Web**.
3. Copie a configuração do app para `js/firebase-config.js`.
4. No Firestore, em **Regras**, publique:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /estoques/{id} {
         allow read, write: if true;
         match /produtos/{produto} {
           allow read, write: if true;
         }
       }
     }
   }
   ```
   > Essas regras deixam o banco aberto e servem para o ambiente acadêmico. Em um sistema real, o acesso deve exigir login (Firebase Authentication).
5. Abra a pasta no VS Code e rode `html/estoque.html` com a extensão **Live Server** (abrir o arquivo com duplo clique não funciona, porque o projeto usa módulos ES).

Enquanto o `firebase-config.js` tiver valores `COLE_AQUI`, o sistema funciona em **modo demonstração**, com dados guardados só no navegador.

## Publicação

O site é publicado com o Firebase Hosting:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting     # public directory: .   |   single-page app: No
firebase deploy
```

## Fluxo de trabalho da equipe

- Cada integrante trabalha em **uma branch própria** (ex.: `login-css-html-henrique`).
- As mudanças entram na `main` por **pull request**.
- Os commits são pequenos e frequentes, com mensagens que descrevem o que mudou.
- Antes de começar uma tarefa: `git pull` na `main`.

O histórico de commits e de pull requests mostra o desenvolvimento incremental feito por toda a equipe.

## Próximos passos

- Autenticação de usuários com Firebase Authentication e regras de segurança por usuário.
- Tela de cadastro, perfil e configurações.
- Histórico de entradas e saídas de produtos.
- Relatórios e exportação da planilha.
