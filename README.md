# Painel da Padaria

Dashboard de vendas e estoque para padaria/mercearia. Sincroniza em tempo real
entre vários dispositivos usando o Firebase (banco de dados gratuito na nuvem).

## 1. Criar o banco de dados (Firebase) — precisa ser feito uma vez

1. Acesse https://console.firebase.google.com e crie um projeto gratuito (pode
   chamar de "padaria" ou o nome que preferir).
2. No menu lateral, clique em **Firestore Database** → **Criar banco de dados**.
   Escolha o modo **produção** e a região mais próxima (ex: `southamerica-east1`).
3. Ainda no console, clique no ícone de engrenagem (⚙️) → **Configurações do
   projeto** → aba **Geral** → em "Seus apps", clique no ícone `</>` (Web) e
   registre um app (não precisa de Hosting).
4. O Firebase vai te mostrar um bloco `firebaseConfig = {...}`. Copie os
   valores e cole no arquivo `src/firebaseConfig.js` deste projeto.

### Proteger os dados (recomendado)

Por padrão, o Firestore em "modo produção" bloqueia tudo. Vá em **Firestore
Database → Regras** e cole isto para permitir leitura/escrita apenas de quem
tem o link do seu app (nível básico de proteção):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /padaria/{doc} {
      allow read, write: if true;
    }
  }
}
```

Isso já funciona para uso interno. Se quiser reforçar a segurança depois
(exigir login), me avise que ajudamos a configurar o Firebase Authentication.

## 2. Rodar localmente (antes de publicar)

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. Teste registrar uma venda e veja se o
Firestore Database no console do Firebase mostra o documento `padaria/store`
sendo atualizado.

## 3. Publicar no GitHub Pages

```bash
# 1. Crie um repositório novo no GitHub (ex: painel-padaria) e suba o código
git init
git add .
git commit -m "Painel da padaria"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/painel-padaria.git
git push -u origin main

# 2. Confirme que o "base" em vite.config.js é "/painel-padaria/"
#    (troque pelo nome real do seu repositório)

# 3. Publique
npm install
npm run deploy
```

O comando `npm run deploy` gera a versão de produção e publica na branch
`gh-pages`. Depois, vá em **Settings → Pages** do repositório no GitHub e
confirme que a branch `gh-pages` está selecionada como fonte. Seu painel fica
disponível em `https://SEU_USUARIO.github.io/painel-padaria/`.

### Alternativa mais simples: Vercel ou Netlify

Se preferir não mexer com `gh-pages`, é só conectar o mesmo repositório do
GitHub na Vercel (https://vercel.com) ou Netlify (https://netlify.com) — elas
detectam o Vite automaticamente e publicam sozinhas a cada `git push`. Nesse
caso, deixe `base: "/"` no `vite.config.js`.

## Como funciona por dentro

- Todos os dispositivos leem e escrevem no mesmo documento do Firestore
  (`padaria/store`), então uma venda registrada no celular do caixa aparece
  na hora no computador do balcão.
- Os produtos padrão (pães, pão de queijo, salgados, bolo, hambúrguer,
  tapioca, cuscuz, café, açúcar, manteiga 500g/250g, ovos, leite, bolacha,
  fatias e bebidas) já vêm cadastrados — ajuste preços e estoque direto na
  aba "Estoque".
- Ao dar F5 ou abrir em outro aparelho, os dados são os mesmos, salvos na
  nuvem — não dependem mais do navegador de um usuário específico.
