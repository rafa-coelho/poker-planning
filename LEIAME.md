# Poker Planning App 🃏

[Read in English](./README.md)

## 📌 Sobre o Projeto

O **Poker Planning App** é uma aplicação colaborativa para estimativa de esforço em equipes de desenvolvimento ágil. Com suporte a múltiplos jogadores e uma interface dinâmica, a ferramenta permite que os participantes votem em suas estimativas de forma interativa, garantindo um processo de decisão eficiente e participativo.

## 🚀 Tecnologias Utilizadas

- **Frontend:** Next.js (React) + TailwindCSS
- **Backend:** Node.js + Express + Socket.io
- **Banco de Dados:** In-memory (armazenamento temporário na memória do servidor)
- **Autenticação:** Sessão baseada em localStorage
- **Deploy:** Configuração para Docker, Vercel ou outros ambientes

## 🎮 Funcionalidades

✔️ Criar e entrar em salas com um nome personalizado
✔️ Votação interativa com cartas de Poker Planning
✔️ Sistema de revelação dos votos com animação e estatísticas
✔️ Interface responsiva e moderna
✔️ Comunicação em tempo real via WebSockets
✔️ Toasts e modais para melhor experiência do usuário

## 📥 Instalação e Configuração

### 🔧 Pré-requisitos

- Node.js **>= 16.x**
- npm ou yarn

### 🛠️ Passo a Passo

1. **Clone o repositório**
   ```sh
   git clone https://github.com/rafa-coelho/poker-planning.git
   cd poker-planning
   ```
2. **Instale as dependências**
   ```sh
   npm install
   # ou
   yarn install
   ```
3. **Execute**
   ```sh
   npm run dev
   ```
4. **Acesse no navegador**
   ```sh
   http://localhost:3000
   ```

## 🎲 Como Usar

### Criando uma sessão

1. Acesse a página inicial e forneça um nome para a sessão.
2. Clique em "Criar sessão" e compartilhe o link gerado.

### Entrando em uma sessão

1. Acesse o link compartilhado ou entre no endereço manualmente.
2. Insira seu nome e clique em "Entrar".

### Votando e revelando

1. Selecione uma carta com sua estimativa.
2. O moderador pode clicar em "Revelar" para exibir os votos.
3. O sistema calcula a média dos votos e exibe um "termômetro" de concordância.

## 🌍 Internacionalização (i18n)

O aplicativo suporta múltiplos idiomas. As traduções disponíveis incluem:

- **Português (pt-BR)**
- **Inglês (en-US)**

Se deseja adicionar um novo idioma, basta incluir as traduções em `i18n/index.ts`.

## 🤝 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Faça um **fork** do repositório
2. Crie uma **branch** com sua feature/fix (`git checkout -b feature-nova`)
3. Faça um **commit** das mudanças (`git commit -m 'Adicionando nova feature'`)
4. Envie um **push** para a branch (`git push origin feature-nova`)
5. Abra um **Pull Request** 🚀

## 📜 Licença

Este projeto está sob a licença **MIT**. Sinta-se livre para utilizá-lo e modificá-lo conforme necessário!

---

✉️ Precisa de ajuda ou quer dar feedback? Entre em contato! 🚀

