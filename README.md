# BBtec - Sistema de Controle de Estoque

> Projeto de extensão - BBtec: TADS, Desenvolvimento Web 1 e IFSP - Campinas

O **BBtec** é um sistema web de controle de estoque criado para ajudar **pequenas e médias empresas** a organizar seus produtos. Com ele, o usuário cadastra estoques, controla produtos (preço, quantidade, validade e fornecedor) e recebe **alertas automáticos** quando um produto está com estoque baixo ou perto do vencimento.

🔗 **Site publicado:** https://bbtec-fd1d0.web.app/

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
| Henrique Lyhan | [@lyhan32](https://github.com/lyhan32) | Tela de Login, HTML, CSS |

## Problema e objetivo

Muitos pequenos negócios controlam o estoque em cadernos ou planilhas soltas. Isso causa falta de produtos, perdas por validade vencida e falta de visão geral do que existe em cada estoque.

O BBtec propõe uma interface **simples, organizada e intuitiva** para:

- centralizar vários estoques em um só lugar;
- manter os dados de cada produto e de seu fornecedor;
- avisar o usuário antes que o problema aconteça.

## Funcionalidades

**Contas e acesso**
- Cadastro com validação dos campos e indicador de força da senha.
- Login com e-mail e senha ou com o Google, e recuperação de senha por e-mail.
- Telas do sistema protegidas: quem não está logado volta para o login, e o botão SAIR encerra a sessão.
- Cada usuário vê e altera apenas os seus estoques.

**Estoques**
- Listar os estoques em cartões, com foto, situação (ativo ou desativado) e quantidade de alertas.
- Buscar por nome, filtrar (todos, ativos, desativados) e paginar.
- Criar, editar e excluir estoque, com foto enviada do computador ou link de imagem.

**Produtos** (planilha de cada estoque)
- Tabela com nome, código, preço, validade e quantidade.
- Cadastrar produto com todas as informações: nome, código, preço, validade, quantidade, fornecedor e endereço do fornecedor.
- Ao clicar no produto: ver os detalhes, editar ou excluir (com confirmação).
- Busca por nome ou código e validação dos campos (por exemplo, não permite código repetido).

**Entradas e saídas**
- Nos detalhes do produto: registrar entrada ou saída, com quantidade e motivo (a saída não pode passar do saldo).
- Cadastro, ajuste de quantidade na edição e exclusão de produto também entram no histórico.

**Relatórios**
- Resumo do estoque: total de estoques, produtos, unidades, valor em estoque e produtos com alerta, com a situação de cada produto.
- Histórico de movimentações: filtro por estoque, tipo, período e busca.
- Exportação da planilha em CSV (abre no Excel) e impressão ou PDF.

**Perfil e configurações**
- Editar nome, empresa e cargo; redefinir a senha por e-mail.
- Configurar quando avisar: limite de estoque baixo e dias de antecedência da validade, ou desligar cada tipo de aviso.

**Alertas**
- Avisos de **estoque baixo** (ou sem estoque) e de **validade próxima** (ou produto vencido).
- Filtro por tipo de alerta.
- Botão "Ver Detalhes" que abre direto o produto em questão.
- Selo com o número de alertas no menu e contagem em cada cartão de estoque.

## Telas do sistema

| Tela | Arquivo | Descrição |
|------|---------|-----------|
| Início | `index.html` | Apresentação do sistema |
| Cadastro | `html/cadastro.html` | Criação de conta |
| Login | `html/login.html` | Acesso com e-mail e senha ou com o Google |
| Estoques | `html/estoque.html` | Lista de estoques do usuário |
| Produtos | `html/produtos.html` | Planilha de produtos de um estoque |
| Alertas | `html/alertas.html` | Avisos de estoque baixo e validade |
| Relatórios | `html/relatorios.html` | Resumo do estoque, histórico de movimentações e exportação |
| Configuração | `html/configuracao.html` | Regras de alerta de cada usuário |
| Perfil | `html/perfil.html` | Dados pessoais e segurança da conta |

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
│   ├── cadastro.html
│   ├── estoque.html
│   ├── produtos.html
│   ├── alertas.html
│   ├── relatorios.html
│   ├── configuracao.html
│   └── perfil.html
├── css/                    # Estilos de cada tela
│   ├── style.css
│   ├── login.css
│   ├── cadastro.css
│   ├── estoque.css
│   ├── produtos.css
│   ├── alertas.css
│   └── paginas.css
├── js/                     # Lógica das telas e do Firebase
│   ├── firebase-config.js  # Configuração do projeto Firebase
│   ├── firebase-app.js     # Inicialização do Firebase (Auth + Firestore)
│   ├── sessao.js           # Proteção das telas e logout
│   ├── regras-alertas.js   # Regras compartilhadas dos alertas
│   ├── login.js
│   ├── cadastro.js
│   ├── estoque.js
│   ├── produtos.js
│   ├── alertas.js
│   ├── relatorios.js
│   ├── configuracao.js
│   └── perfil.js
├── img/                    # Logo e imagens
└── README.md
```

## Banco de dados

Os dados ficam no **Firestore**, em formato JSON, em duas coleções:

```
usuarios (coleção)
└── {uid} (documento)
    ├── nome: "Bruna Cristina"
    ├── email: "usuario@email.com"
    ├── empresa: "Minha Empresa"
    ├── cargo: "Gerente"
    ├── config: { limiteEstoqueBaixo: 5, diasVencimento: 7, alertaEstoque: true, alertaValidade: true }
    └── criadoEm: timestamp

estoques (coleção)
└── {idDoEstoque} (documento)
    ├── nome: "Produtos de Limpeza"
    ├── status: "ativo" | "desativado"
    ├── imagem: "https://..." ou imagem em texto (data URL)
    ├── donoId: "{uid do usuário dono}"
    ├── criadoEm: timestamp
    ├── produtos (subcoleção)
    │   └── {idDoProduto} (documento)
    │       ├── nome: "Detergente"
    │       ├── codigo: "DET-001"
    │       ├── preco: 13.00
    │       ├── quantidade: 10
    │       ├── validade: "2026-12-10"
    │       ├── fornecedor: "Distribuidora Limpa Bem"
    │       └── endereco: "Rua Exemplo, 100, Centro"
    └── movimentacoes (subcoleção: histórico de entradas e saídas)
        └── {idDaMovimentacao} (documento)
            ├── produtoId, produtoNome, produtoCodigo
            ├── tipo: "entrada" | "saida"
            ├── quantidade: 3
            ├── saldoAnterior: 10
            ├── saldoNovo: 7
            ├── motivo: "Venda"
            ├── usuarioNome: "Bruna Cristina"
            └── data: timestamp
```
## Regras de segurança do Firestore
Cada usuário acessa só o próprio perfil e os próprios estoques (e os produtos deles):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /usuarios/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    match /estoques/{id} {
      allow read, delete: if request.auth != null && resource.data.donoId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.donoId == request.auth.uid;
      allow update: if request.auth != null && resource.data.donoId == request.auth.uid
                    && request.resource.data.donoId == request.auth.uid;

      match /produtos/{produto} {
        allow read, write: if request.auth != null
          && get(/databases/$(database)/documents/estoques/$(id)).data.donoId == request.auth.uid;
      }

      // Histórico: pode ser lido e criado, mas não editado
      match /movimentacoes/{mov} {
        allow read, create, delete: if request.auth != null
          && get(/databases/$(database)/documents/estoques/$(id)).data.donoId == request.auth.uid;
      }
    }
  }
}

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
   git clone https://github.com/brulameira/BBTEC.git
   ```
2. Crie um projeto no [Firebase Console](https://console.firebase.google.com), ative o **Firestore** e registre um app **Web**.
3. Ative o **Firestore** e, em **Authentication** > Sign-in method, ative E-mail/senha e Google

4. Copie a configuração do app para js/firebase-config.js e publique as regras do Firestore da seção Banco de dados.
   
5. Abra a pasta no VS Code e rode html/login.html com a extensão Live Server (abrir o arquivo com duplo clique não funciona, porque o projeto usa módulos ES). Acesse por localhost: o login com Google só funciona em domínios autorizados no Firebase.

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

## Futuros passos

- Gráficos nos relatórios.
- Estoque compartilhado entre vários usuários da mesma empresa.
