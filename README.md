# NFS-e Resumo

Ferramenta simples para a tela **NFS-e Emitidas** do [Portal Nacional NFS-e](https://www.nfse.gov.br/emissornacional/).

**Gratuita e de código aberto.** Repositório: [github.com/filipechgs/nfse-e_resumo](https://github.com/filipechgs/nfse-e_resumo)

## O que é e para que serve

No portal você vê a lista de notas, mas **não aparece o total em reais** e **não há um botão fácil para baixar a lista** (planilha ou PDF).

Além disso, o site só deixa buscar **no máximo 30 dias** por vez. Para ver o ano inteiro, seria preciso repetir a busca várias vezes à mão.

O **NFS-e Resumo** resolve isso no seu próprio navegador:

- mostra a **quantidade** de notas e a **soma dos valores**;
- permite escolher **mês** e **ano** e pesquisar o período completo do mês;
- exporta a lista em **CSV** (planilha);
- pode buscar **o ano inteiro** e exportar em **CSV** ou **PDF**.

Seus dados **não são enviados** para nenhum site externo. O script só trabalha na página em que você já está logado.

> Ferramenta **não oficial**. Não tem vínculo com SERPRO, Receita Federal ou prefeituras.

## O que aparece na página depois de ativar

- Um quadro com o **total** das notas da lista
- Filtros de **Mês** e **Ano** + botão **Pesquisar**
- Botão **Exportar CSV** (lista que está na tela)
- Botão **Exportar ano selecionado** (busca o ano e gera CSV ou PDF)

## Forma mais fácil de usar (recomendado)

Se outra pessoa puder ajudar na instalação, o caminho mais simples no dia a dia é o **Tampermonkey**: o script abre sozinho sempre que você entrar em NFS-e Emitidas. Veja o tutorial no final desta página / no `index.html`.

## Arquivos do projeto

| Arquivo | Para que serve |
| --- | --- |
| [`nfse-resumo.js`](nfse-resumo.js) | Script completo (usar no Console ou no Tampermonkey) |
| [`nfse-resumo.bookmarklet.js`](nfse-resumo.bookmarklet.js) | Versão para criar um **favorito** |
| [`index.html`](index.html) | Página com passo a passo e botões de copiar |

## Como usar pelo Console

1. Entre no portal e abra **NFS-e Emitidas** (é preciso estar logado).
2. Pressione a tecla **F12**.
3. Clique na aba **Console**.
4. Abra o arquivo [`nfse-resumo.js`](nfse-resumo.js), copie **tudo** e cole no Console.
5. Pressione **Enter**.
6. Pronto: os botões e o total devem aparecer na página.

Se você **atualizar** (recarregar) a página, o script some. Nesse caso, cole de novo — ou use o favorito / Tampermonkey.

## Como usar como favorito

1. Abra [`nfse-resumo.bookmarklet.js`](nfse-resumo.bookmarklet.js) e copie **toda** a linha (começa com `javascript:`).
2. Crie um favorito chamado **NFS-e Resumo**.
3. No campo de endereço/URL do favorito, **cole** o que você copiou.
4. Abra **NFS-e Emitidas** e clique nesse favorito.

Se o favorito não funcionar (alguns navegadores cortam textos muito longos), use o Console ou o Tampermonkey.

## Como exportar o ano inteiro

1. Ative o NFS-e Resumo.
2. Escolha o **Ano**.
3. Clique em **Exportar ano selecionado**.
4. Clique em **Buscar ano** e aguarde (pode levar 1 ou 2 minutos).
5. Depois use **Exportar CSV** ou **Exportar PDF**.  
   No PDF, na janela de impressão, escolha **Salvar como PDF**.

## Como contribuir

Sugestões, correções e melhorias são bem-vindas. O fluxo usual no GitHub é:

1. Abra o repositório [filipechgs/nfse-e_resumo](https://github.com/filipechgs/nfse-e_resumo) e clique em **Fork** para criar uma cópia na sua conta.
2. Clone o seu fork e crie um branch para a alteração (por exemplo `git checkout -b melhora-exportacao`).
3. Faça as mudanças, teste no portal (tela **NFS-e Emitidas**) e faça commit.
4. Envie o branch para o seu fork (`git push -u origin melhora-exportacao`).
5. No GitHub, abra um **Pull Request** apontando para o repositório original (`filipechgs/nfse-e_resumo`), descrevendo o que mudou e por quê.

Se preferir só reportar um problema ou ideia, abra uma [issue](https://github.com/filipechgs/nfse-e_resumo/issues).

## Licença

MIT — veja [`LICENSE`](LICENSE).

Código-fonte: [https://github.com/filipechgs/nfse-e_resumo](https://github.com/filipechgs/nfse-e_resumo)
