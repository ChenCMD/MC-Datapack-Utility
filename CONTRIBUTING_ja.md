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

コンテナには Node.js 24、Yarn Classic、Claude Code、Codex CLI、GitHub CLI、Git、ripgrep、jq、Python、Chromium が入ります。作成時に `yarn install --frozen-lockfile` と `yarn compile` を実行します。ワークスペースは `/workspaces/MC-Datapack-Utility`、コンテナのホームは `/home/node` です。ホームと `node_modules` は別々の名前付きボリュームで永続化します。

### ホストの AI 設定を取り込む

ホスト初期化は `.devcontainer/scripts/initialize.cjs` が担当します。未作成の `~/.codex`、`~/.claude`、`~/.agents` を作り、ホストのパスだけを記録した `.devcontainer/compose.host.yaml` を生成します。このファイルは Git・Docker ビルド対象外です。既存の設定や指示ファイルは変更せず、認証情報の一時ファイルも作りません。

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

`yarn watch` で変更を監視できます。現在のリポジトリには `Extension Tests` が参照するスイートがないため、デバッグには `Run Extension` 構成を使ってください。同期処理の検証は `node --test .devcontainer/tests/initialize.test.cjs` と `python3 -m unittest discover -s .devcontainer/tests -p 'test_*.py'` で実行できます。Python の検証はコンテナ内で行えます。所有権の回帰テスト `.devcontainer/tests/test-volume-ownership.sh` は、root の使い捨て Linux コンテナ内で実行してください。入れ子の bind mount 検証には `CAP_SYS_ADMIN` が必要ですが、開発コンテナ自身には追加しません。

参照: [GitNexus のホスト設定取り込み](https://github.com/abhigyanpatwari/GitNexus/blob/main/.devcontainer/README.md)、[VS Code の拡張機能デバッグ](https://code.visualstudio.com/api/advanced-topics/remote-extensions#_debugging-in-a-custom-development-container)、[Claude の DevContainer](https://code.claude.com/docs/en/devcontainer)、[Codex の認証保存](https://developers.openai.com/codex/auth/)。
