# XNotes

Bloco de notas open source com IA integrada, para Windows e Linux. Abre, edita e guarda ficheiros de texto como num bloco de notas normal, e tem um painel de IA ligado à API da [Groq](https://console.groq.com) com a tua própria chave.

## Descarregar

Vai à página de [Releases](https://github.com/XCODE-MAIN/XNOTES/releases) e descarrega o ficheiro para o teu sistema:

| Sistema | Ficheiro |
| --- | --- |
| Windows (instalador) | `XNotes-Setup-x.y.z.exe` |
| Windows (sem instalar) | `XNotes-Portable-x.y.z.exe` |
| Linux | `XNotes-x.y.z.AppImage` ou `XNotes-x.y.z.deb` |

O `.exe` não tem assinatura digital, por isso o Windows pode mostrar o aviso "O Windows protegeu o seu PC". Clica em **Mais informações** e depois em **Executar mesmo assim**.

## Funcionalidades

- **Modo trabalho**: ambiente claro, tipo de letra com serifa, ações rápidas para resumir, melhorar, corrigir, traduzir e extrair tarefas.
- **Modo código**: ambiente escuro, tipo de letra monoespaçado, números de linha, Tab com indentação, ações rápidas para explicar, encontrar bugs, comentar, refatorar e gerar testes.
- Abrir, guardar e guardar como em qualquer ficheiro de texto (limite de 5 MB ao abrir).
- A IA trabalha sobre a seleção ou, sem seleção, sobre o documento inteiro. As respostas têm os botões **Inserir**, **Substituir** e **Copiar**, e Ctrl+Z desfaz.
- Respostas em streaming, com botão para parar.
- A chave fica cifrada com o cofre de chaves do sistema, quando existe.

O bloco de notas funciona sem internet e sem chave. A chave só é precisa para a parte de IA.

## Como obter uma chave da Groq

A app não traz nenhuma chave incluída. Cada pessoa usa a sua, e a Groq tem um plano gratuito com limites de utilização (confirma os limites atuais em console.groq.com).

1. Abre https://console.groq.com e cria uma conta (ou entra com Google ou GitHub).
2. No menu, abre **API Keys** (https://console.groq.com/keys).
3. Clica em **Create API Key**, dá-lhe um nome (por exemplo, `xnotes`) e clica em criar.
4. **Copia a chave logo**, que começa por `gsk_`. A Groq só a mostra uma vez.
5. Abre o XNotes, carrega em **Ctrl+,** (ou no botão **Definições**), cola a chave no campo **API key da Groq** e escolhe o modelo.
6. Clica em **Guardar**. O nome do modelo aparece no canto inferior direito.

A chave fica guardada só no teu computador (Windows: `%APPDATA%\XNotes`, Linux: `~/.config/XNotes`).

**Cuidados:**
- Nunca partilhes a chave nem a coloques em ficheiros do projeto, issues ou prints. Se ficar exposta, apaga-a em console.groq.com/keys e cria outra.
- Os modelos disponíveis variam de conta para conta. O modelo por defeito é `openai/gpt-oss-120b`. Se aparecer o erro `404 ... does not exist or you do not have access`, escolhe outro nas definições. A lista da tua conta está no Playground da Groq.

## Correr a partir do código

Requer [Node.js](https://nodejs.org) 18 ou superior (versão LTS) e [Git](https://git-scm.com).

```bash
git clone https://github.com/XCODE-MAIN/XNOTES.git
cd xnotes
npm install
npm start
```

Se aparecer um erro de sandbox do Chromium em algumas distribuições Linux, usa `npm run start:nosandbox`.

## Transformar o código numa app instalável

Dentro da pasta do projeto (a que tem o `package.json`):

```bash
npm install          # só na primeira vez
npm run dist:win     # Windows: instalador e versão portátil (.exe)
npm run dist:linux   # Linux: .AppImage e .deb
```

Os ficheiros ficam na pasta `dist/`:

- `XNotes-Setup-x.y.z.exe`: instalador para Windows (dá duplo clique para instalar)
- `XNotes-Portable-x.y.z.exe`: corre sem instalar
- `dist/win-unpacked/XNotes.exe`: a app já pronta, sem instalador
- `XNotes-x.y.z.AppImage` e `XNotes-x.y.z.deb`: Linux

Notas:

- O `.exe` deve ser gerado no Windows, e o `.AppImage` e o `.deb` no Linux. O GitHub Actions faz os dois (ver abaixo).
- Se no Windows aparecer o erro `Cannot create symbolic link`, abre o terminal **como administrador** (ou ativa o **Modo de programador** em Definições, Sistema, Para programadores) e repete o comando.
- Para mudar a versão, altera o campo `version` no `package.json`.
- Para ter um ícone próprio, põe um `icon.png` de 512×512 numa pasta `build/`.

## Publicar o .exe no GitHub

### Automático (recomendado)

O workflow em `.github/workflows/release.yml` compila em Windows e Linux e cria a release sozinho quando publicas uma tag que começa por `v`:

```bash
git tag v0.1.0
git push origin v0.1.0
```

1. No repositório, abre o separador **Actions** e espera até ficar com o visto verde (5 a 10 minutos).
2. Os ficheiros aparecem em **Releases**, no lado direito da página principal.

Para uma nova versão, altera a `version` no `package.json`, faz commit e push, e cria uma tag nova (`v0.2.0`, por exemplo).

### Manual (com o .exe que geraste no teu PC)

1. No repositório, clica em **Releases** e depois em **Draft a new release**.
2. Em **Choose a tag**, escreve `v0.1.0` e clica em **Create new tag**.
3. Dá um título (por exemplo, `XNotes 0.1.0`) e escreve uma descrição.
4. Arrasta para a caixa **Attach binaries** os ficheiros da pasta `dist/` (`XNotes-Setup-0.1.0.exe`, e opcionalmente o portátil). Não carregues a pasta inteira.
5. Clica em **Publish release**.

Os ficheiros `.exe` não vão no repositório de código (a pasta `dist/` está no `.gitignore`), só nas Releases.

## Atalhos

| Atalho | Ação |
| --- | --- |
| Ctrl+N / Ctrl+O | Novo / Abrir |
| Ctrl+S / Ctrl+Shift+S | Guardar / Guardar como |
| Ctrl+M | Alternar modo trabalho e código |
| Ctrl+J | Mostrar ou esconder o painel de IA |
| Ctrl+, | Definições |
| Esc | Parar a resposta da IA |

## Estrutura

```
main.js            processo principal: ficheiros, definições, chamada à Groq
preload.js         ponte segura entre o processo principal e a interface
renderer/          interface (HTML, CSS e JavaScript sem dependências)
.github/workflows  compilação automática das releases
```

## Ideias para o futuro

- Separadores e abrir vários ficheiros
- Realce de sintaxe
- Botão para listar os modelos disponíveis na conta
- Modelos locais com Ollama, sem chave nem internet
- Arrastar e largar ficheiros, pesquisa e substituição
- Guardar rascunho automaticamente

## Contribuir

Issues e pull requests são bem-vindos. Abre um issue a descrever o problema ou a ideia antes de enviares alterações grandes.

## Licença

MIT
