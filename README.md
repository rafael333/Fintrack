# 💰 Sistema de Gestão Financeira

Um sistema completo de gestão financeira pessoal desenvolvido em React + TypeScript com Firebase.

## 🚀 Funcionalidades

- **Dashboard Interativo**: Visualização de saldo, receitas e despesas
- **Gestão de Transações**: Adicionar, editar e excluir transações
- **Relatórios Avançados**: Gráficos e análises detalhadas
- **Categorização**: Organize suas transações por categorias
- **Metas Mensais**: Acompanhe seu progresso financeiro
- **Interface Responsiva**: Funciona perfeitamente em mobile e desktop

## 🛠️ Tecnologias

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore + Auth)
- **Build**: Vite
- **Animações**: Lottie React

## 📦 Instalação

```bash
# Clone o repositório
git clone <url-do-repositorio>

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local

# Execute o projeto
npm run dev

# Verifique os cálculos e o código antes de publicar
npm test
npm run lint
npm run build
```

## 🔧 Configuração

1. Configure suas credenciais do Firebase no arquivo `.env.local`
2. Publique `firestore.rules` no Firebase antes de usar dados reais; as regras locais não são aplicadas automaticamente pelo Netlify
3. Execute o projeto com `npm run dev`

## 📱 Interface

- **Dashboard**: Visão geral das finanças
- **Transações**: Gestão completa de movimentações
- **Relatórios**: Análises e gráficos detalhados
- **Configurações**: Personalização do sistema

## 🚀 Deploy

O projeto está configurado para deploy automático no Netlify.

## 📄 Licença

Este projeto está sob a licença MIT.
