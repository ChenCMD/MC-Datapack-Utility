# コントリビュートについて

## バグやアイディアがあります！

MC Datapack Utilityにバグや機能のアイディアがある場合は、[Issueを開いて](https://github.com/ChenCMD/MC-Datapack-Utility/issues/new)それを私たちに共有してください！

また、一つのIssueには一つのバグ/アイディアのみを入れ、バグの場合は再現や修正に有用な情報を入れて作成してくれるととても助かります！

## MC Datapack Utilityを翻訳したい！

MC Datapack Utilityは複数の言語をサポートしています。
このプロジェクトをあなたの言語に翻訳していただけたらMCDUはもっといいものになると思います。

また、[SPGoding](https://github.com/SPGoding)の翻訳用のウェブサイトを一緒に使わせていただいてます。

#### ステップ
1. [翻訳用のウェブサイト](https://l10n.spgoding.com/)に行く
1. GitHubアカウント(推奨)もしくはメールアドレスで登録する
  - ユーザー名とメールアドレスはリポジトリのcommitログに表示されることに注意してください。
  メールアドレスを公開したくない場合[SPGoding](https://github.com/SPGoding/datapack-language-server/wiki/Contact-SPGoding)に連絡して偽のメールアドレスのアカウントを取得してください。
1. [ここ](https://l10n.spgoding.com/projects/mc-datapack-utility)でMCDUの二つのコンポーネントを参照してください。
1. 翻訳を始めましょう！

#### 注意
- 翻訳したい言語がプラットフォームにリストされていない場合は、[ChenCMD](https://github.com/ChenCMD/MC-Datapack-Utility/wiki/Contact)に連絡をお願いします。
- `en-us`の翻訳に提案がある場合は、[Issueを作って](https://github.com/ChenCMD/MC-Datapack-Utility/issues/new)ください


## DevContainer で開発する

Docker（Compose を含む）、ホストの Node.js 18 以上、VS Code の Dev Containers 拡張機能を用意し、このフォルダーで `Dev Containers: Reopen in Container` を実行してください。Windows ネイティブ・WSL・macOS・Linux のホームパスを Node.js で解決します。ホストに Python や Bash、Claude / Codex のインストールは不要です。Windows / macOS の実機では未検証です。

コンテナには Node.js 24、pnpm 12.8.2 (Corepack)、Claude Code、Codex CLI、GitHub CLI、Git、ripgrep、jq、Python、Chromium が入ります。作成時に `pnpm install --frozen-lockfile` と `pnpm compile` を実行します。ワークスペースは `/workspaces/MC-Datapack-Utility`、コンテナのホームは `/home/node` です。ホームと `node_modules` は別々の名前付きボリュームで永続化します。

### 開発ツールと検証

ローカル開発には Node.js 24.x の 24.10 以上（`.node-version`）と、`package.json` に固定した pnpm 12.8.2 を使います。DevContainer と CI は Corepack 0.34.6 を導入します。既存のローカル Yarn 環境から移行する場合は、生成物の `node_modules` ディレクトリを削除してからインストールしてください。DevContainer 内では Rebuild を使い、依存ボリュームを安全に初期化してください。ローカルの Node に Corepack がある場合は、次の手順で開始してください。

```bash
corepack enable
corepack install
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm package
```

ツールチェーンの変更を反映するには DevContainer を Rebuild してください。pnpm とそのネイティブ実行ファイルは、永続ホームの外の `/opt/corepack` に事前配置します。ホーム・依存関係のボリュームは保持します。作成／Rebuild 時は `reset-node-modules.py` で `.pnpm-store` 以外の依存の生成物を削除し、ロックファイルを固定して再生成します。これにより、残った旧 Yarn のパッケージが間接的な optional 依存としてバンドルに入ることを防ぎます。ルートがシンボリックリンクの場合や入れ子のマウントがある場合は拒否し、依存のリンク先は削除しません。`yarn.lock` は `pnpm-lock.yaml` に置き換わります。pnpm のバージョンは Corepack が管理し、`pmOnFail: ignore` で GitHub の依存スキャンが解析できない環境用文書の追加を防ぎます。ロックファイルはプロジェクト用の単一文書に保ってください。`pnpm lint` は検査のみ、`pnpm lint:fix` は自動修正を行います。TypeScript は typescript-eslint の対応範囲内の 6 を使い、VS Code API の型定義は拡張機能の最小対応バージョンに合わせて 1.75 を使います。

`esbuild` で拡張機能と各言語の JSON を1つの CommonJS ファイルにまとめ、VS Code 1.75 の拡張ホストで使える Node 16 を対象にします。`compile` は型チェックとソースマップの生成、`build` は型チェックと圧縮を行います。`watch` はバンドラーと TypeScript の検査を同時に実行し、VS Code の監視タスクは両方の診断を表示します。VSIX 作成時は `vscode:prepublish` で production ビルドを実行します。実行時の依存はバンドル済みなので、依存関係の列挙は無効にします（`vsce.dependencies: false`）。`pnpm test` は圧縮済みバンドルでの言語読み込み・数式置換・スコア変換と、VS Code に依存しないスコア処理を確認します。数式置換の既存の `eval` には esbuild が警告を出しますが、今回の移行ではその挙動を維持します。

Check CI はロックファイルを固定したインストール、`pnpm check`、production ビルドを使った実 VS Code の統合テスト、VSIX 作成を実行します。Release CI も検査と統合テストを通してから公開します。VS Code 1.75 と stable の両方を確認します。キャッシュ対象は `pnpm store path` の結果から取得し、GitHub Actions はコミットに固定します。公開は `release` ブランチだけで行い、公開用の認証情報はそのステップにだけ渡します。コンテナの Rebuild と GUI デバッグは別途手動で確認してください。

### 依存関係のサプライチェーン対策

`pnpm-workspace.yaml` では公開から7日以上経過したレジストリのバージョンだけを導入します（`minimumReleaseAge: 10080`）。ロックファイルに記録済みのバージョンも対象です。公開日時が不明な場合や、指定範囲に7日以上経過したバージョンがない場合は失敗します。対応する古いバージョンを選ぶか、時間の経過を待ってください。更新を通すためにこの検査を無効化したり、広い除外設定を加えたりしないでください。

インストールスクリプトは明示的な判断が必要で、未判断のものがあると失敗します（`strictDepBuilds: true`）。`allowBuilds` では esbuild・拡張機能の署名サポート・keytar の指定バージョンだけを許可します。新しいバージョンを許可する前にスクリプトの変更内容を確認してください。間接依存からの git・tarball の取り込みを制限し、ロックファイルにもポリシーの検証を適用します（`trustLockfile: false`）。マニフェスト・ポリシー・ロックファイルをまとめてコミットし、マージ前に `pnpm install --frozen-lockfile` を確認してください。

対策の対象は pnpm が管理する依存と CI のアクション参照です。全パッケージの安全性を保証するものではなく、ベースイメージや別途導入するエージェント CLI は対象外です。Check CI はビルド・パッケージングの挙動を確認し、依存のソースコードの安全性を検証するものではありません。

参照: [VS Code のバンドル手順](https://code.visualstudio.com/api/working-with-extensions/bundling-extension)、[pnpm の依存ポリシー](https://pnpm.io/settings/dependency-resolution)、[pnpm のビルドスクリプト許可](https://pnpm.io/settings/build)。

### ホストの AI 設定を取り込む

ホスト初期化は `.devcontainer/scripts/initialize.cjs` が担当します。未作成の `~/.codex`、`~/.claude`、`~/.agents` を作り、ホストのパスだけを記録した `.devcontainer/compose.host.yaml` を生成します。このファイルは Git・Docker ビルド対象外です。既存の設定や指示ファイルは変更せず、ホスト直下の `.claude.json`・`CLAUDE.md`・`AGENTS.md` は `.devcontainer/host-settings/` に更新時のスナップショットを作ります。ディレクトリは 700、ファイルは 600（POSIX）、Git・Docker ビルド対象外です。このディレクトリを読み取り専用でマウントするため、元ファイルの置き換え保存がコンテナの再起動を壊しません。通常の stop/start では同期せず、初期化でスナップショットを更新します。 保存先と入れ子のマウント先がシンボリックリンクやディレクトリ以外の場合は初期化を停止します。一時ファイルは一意名で排他的に作成し、置き換えに失敗した場合はその一時ファイルを削除します。以前の固定名 `.tmp` ファイルは変更しません。

ホストの AI ディレクトリは `/mnt/host-settings/` に読み取り専用でマウントし、コンテナ内の Python スクリプトでコピーします。エージェント自身の保存先にホストのファイルを直接マウントしないため、ファイルの置換保存にも対応できます。

| 対象 | 取り込み方法 |
| --- | --- |
| スキル・指示ファイル・補助ファイル・ルール・プラグイン | 作成／Rebuild 時にコピーし直す |
| 設定・認証ファイル | 初回だけ継承し、以後はコンテナ側を保持 |
| セッション・メモリ・履歴・DB・ロック・実行キャッシュ | コピーせず、コンテナ側で保持 |

`.codex` / `.claude` / `.agents` 内は、`.devcontainer/config/agent-sync-policy.json` の設定・実行時データ除外リストを使って同期します。そのため、`AGENTS.md` / `CLAUDE.md` が同じディレクトリ内の補助ファイルを参照していても一緒に取り込めます。ホスト直下の `~/AGENTS.md` と `~/CLAUDE.md` も、存在するときだけ取り込みます。ホストのホームへのテキスト内の参照はコンテナのホームへ変換します。共有範囲内のシンボリックリンクは実体としてコピーしますが、範囲外を指すリンクは取り込みません。AI ディレクトリ外への参照や、ホスト専用の外部コマンドは自動で持ち込めません。

ホストでスキルを追加・更新・削除したら `Dev Containers: Rebuild Container` を実行してください。削除を反映するのは以前に同期したファイルだけです。コンテナ独自のファイルと同名になった場合や、コピー先にシンボリックリンクがある場合は、警告してその項目をスキップします。管理対象のファイル／ディレクトリ変更は反映しますが、コンテナ独自の子ファイルがあれば保持します。コピー済みスキルをコンテナで編集しても、次の Rebuild ではホストの内容を優先します。途中で同期が失敗した場合は、次の Rebuild で更新記録から復旧します。中断した同期の復旧時には、一時的なハードリンクと作成・削除の記録を使い、同じ内容のコンテナ独自ファイルとコピー済みファイルを区別します。同期完了後の管理はパス単位のため、コピー済みファイルをコンテナで作り直してもコンテナ独自のファイルにはならず、後でホストから削除するとコンテナ側も削除します。管理記録はファイル置換で保存します。通常の停止・起動では同期しません。CLI が新しい実行時データを追加した場合は、除外リストを更新してください。

初回継承する設定は Codex の `config.toml`、`*.config.toml`、`auth.json`、`hooks.json`、`notify.sh` と、Claude の `settings.json`、`settings.local.json`、`.credentials.json`、`.mcp.json`、`~/.claude.json` です。既存のボリュームへの移行時には設定・認証・セッションを上書きしません。初回継承の完了状態をエージェントごとに管理するため、Codex だけ継承済みの環境でも、未継承の Claude 設定を取り込めます。旧全体完了マーカーのみの場合は両方の継承済み状態を維持し、削除済みの認証情報を再取り込みしません。OS キーチェーンにしかない認証情報は取り込めないため、必要なら `claude auth login` / `codex login` を実行してください。ホストに AI 設定がない場合も起動できます。

Codex のセッション・SQLite、Claude の `projects/`・`sessions/`、認証、`gh` の認証、Bash のコマンド履歴、VS Code のストレージはホームボリュームに残ります。Bash はプロンプトごとに履歴を保存・取り込みます。UID/GID が変わった場合も、ホームと依存ボリュームの所有権を修復し、ホストへのリンクや入れ子のマウントは変更しません。ボリュームの削除、プロジェクトのパス変更、別ホストでの起動では新しい状態になります。

現在の WSL の Codex 通知スクリプトは `powershell.exe` を使うため、コンテナでは `codex -c 'notify=[]'` で通知を無効化できます。Chrome DevTools MCP の `/usr/bin/google-chrome` は、コンテナ内の Chromium をブラウザー自身のサンドボックスなしで起動するラッパーです。Codex のブラウザーログイン用にポート 1455 を転送します。

GitHub CLI はコンテナ内で初回だけ認証してください。

```bash
gh auth login --hostname github.com --git-protocol https --web --insecure-storage
gh auth setup-git
```

認証ファイルは永続化される `~/.config/gh` に保存されます。

### 拡張機能をデバッグする

「実行とデバッグ」で `Run Extension (Sample Datapack)` を選んで F5 を押すと、コンパイル後にサンプルデータパックを開いた Extension Development Host が起動します。`src/` の TypeScript にブレークポイントを設定し、サンプルの `.mcfunction` や Datapack コマンドで確認できます。サンプルの `pack.mcmeta` で拡張機能のアクティベーション条件を満たします。

既存の `Run Extension` も利用できます。別のデータパックはコンテナからアクセスできるフォルダーを開いてください。`resource/` もワークスペースに含まれ、Webview の CSS / JavaScript を参照できます。GitHub API・raw ファイル・Mojang のバージョン情報を取得する機能には外部ネットワーク接続が必要です。

`pnpm watch` で変更を監視できます。拡張機能の手動検証には `Run Extension` 構成、自動の拡張ホスト検証には `pnpm test:integration` を使ってください。同期処理の検証は `node --test .devcontainer/tests/initialize.test.cjs` と `python3 -m unittest discover -s .devcontainer/tests -p 'test_*.py'` で実行できます。Python の検証はコンテナ内で行えます。所有権の回帰テスト `.devcontainer/tests/test-volume-ownership.sh` は、root の使い捨て Linux コンテナ内で実行してください。入れ子の bind mount 検証には `CAP_SYS_ADMIN` が必要ですが、開発コンテナ自身には追加しません。

参照: [GitNexus のホスト設定取り込み](https://github.com/abhigyanpatwari/GitNexus/blob/main/.devcontainer/README.md)、[VS Code の拡張機能デバッグ](https://code.visualstudio.com/api/advanced-topics/remote-extensions#_debugging-in-a-custom-development-container)、[Claude の DevContainer](https://code.claude.com/docs/en/devcontainer)、[Codex の認証保存](https://developers.openai.com/codex/auth/)。


## 機能テストとリファクタリング

[開発ガイド](docs/development.md) に機能の境界、期待値のサンプル、既知の問題、検証範囲をまとめています。[AGENTS.md](AGENTS.md) は AI が同じ入口と変更ルールを参照するための文書です。画面が不要な確認は `pnpm check` でまとめて実行できます。

実際の VS Code の起動・選択範囲の変換・クリップボードの確認には `pnpm test:integration` を使います。画面のない Linux では `xvfb-run -a pnpm test:integration` とします。`VSCODE_TEST_VERSION=1.75.0` で対応下限も確認できます。統合テストは production ビルドを使いますが、Minecraft 内での実行は検証していません。Check と Release の CI は検査・統合テストを通してからパッケージ作成・公開へ進みます。
