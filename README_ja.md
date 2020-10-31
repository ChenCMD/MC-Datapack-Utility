![Banner](https://raw.githubusercontent.com/ChenCMD/MC-Datapack-Utility/master/images/banner.png)

[![license](https://img.shields.io/github/license/ChenCMD/MC-Datapack-Utility)](https://github.com/ChenCMD/MC-Datapack-Utility/blob/master/LICENCE)
[![Version](https://img.shields.io/visual-studio-marketplace/v/chencmd.mc-datapack-utility?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=chencmd.mc-datapack-utility)
[![LastUpdate](https://img.shields.io/visual-studio-marketplace/last-updated/chencmd.mc-datapack-utility?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=chencmd.mc-datapack-utility)
[![Download](https://img.shields.io/visual-studio-marketplace/d/chencmd.mc-datapack-utility?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=chencmd.mc-datapack-utility)
[![Install](https://img.shields.io/visual-studio-marketplace/i/chencmd.mc-datapack-utility?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=chencmd.mc-datapack-utility)
[![Gitmoji](https://img.shields.io/badge/gitmoji-%20😜%20😍-FFDD67.svg)](https://gitmoji.carloscuesta.me/)

#### [English](https://github.com/ChenCMD/MC-Datapack-Utility/blob/master/README.md) / 日本語

この拡張機能はDatapackの開発に便利な複数の機能を提供します。

- [免責事項](#免責事項)
- [インストール方法](#インストール方法)
- [機能](#機能)
  - [データパックテンプレートの作成](#データパックテンプレートの作成)
  - [リソースパスのコピー](#リソースパスのコピー)
  - [素早いファイルの作成](#素早いファイルの作成)
  - [計算式のscore operationへの変換](#計算式のscore-operationへの変換)
- [推奨事項](#推奨事項)
- [Special Thanks](#Special-Thanks)

# 免責事項

> [MITライセンス](https://github.com/ChenCMD/MC-Datapack-Utility/blob/master/LICENCE)

私たちはファイルが破損しないように最善を尽くしていますが、想定しえない極稀な状況下でファイルが破損する可能性があり得ます。
発生した際に私たちは責任をとることはできません。

大切な作業データは随時バックアップしてください。これはMC Datapack Utilityを使用しない場合でもとても重要です。

# インストール方法

MC Datapack UtilityはVSCode Marketplaceからインストールすることができます
[![Version](https://img.shields.io/visual-studio-marketplace/v/chencmd.mc-datapack-utility?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=chencmd.mc-datapack-utility)

他の方法として、VSCodeで`Ctrl + P`を押し`ext install chencmd.mc-datapack-utility`と入力することでもインストールが可能です。

# 機能
## データパックテンプレートの作成

データパックの作成を簡単にしたい？

`Alt + Shift + D -> Alt + Shift + T`を押しましょう。
この機能を使うと、Datapackの作成をいくつかの質問に流れで答えるだけで簡単に作ることができます。

また、configからオリジナルのデータパックテンプレートを作成することが可能です。

![gif](https://raw.githubusercontent.com/ChenCMD/MC-Datapack-Utility/master/images/createDatapackTemplate.gif)

## リソースパスのコピー

ファイルのリソースパスを簡単に取得したい？

エクスプローラーで取得したいファイルを右クリックして`リソースパスのコピー`を使用しましょう。

![image](https://raw.githubusercontent.com/ChenCMD/MC-Datapack-Utility/master/images/copyResourcePath_ja.png)

## 素早いファイルの作成

.mcfunctionや.jsonをいちいち書いてファイルを作成するのが面倒？

エクスプローラーで作成したいディレクトリのフォルダを右クリックして`データパックファイルを作成する`を使用しましょう。
この機能を使うと、ファイル名を入力するだけで自動的に拡張子を補完してファイルを作成することが可能です。

また、configからファイルの種類毎にデフォルトのファイルの中身を設定することが可能です。
記載することで中身が記載された状態でファイルを作成することが可能です。

![gif](https://raw.githubusercontent.com/ChenCMD/MC-Datapack-Utility/master/images/createFile.gif)

## 計算式のscore operationへの変換

scoreboard players operationで計算式を作るのが面倒？

`Alt + Shift + D -> Alt + Shift + S`を押しましょう。
選択範囲がある場合はその選択範囲を、ない場合は入力した式を`scoreboard players operation`に変換します。

また、configからデフォルトで使用するObjectやスコアホルダーのPrefix、式のInput方法の強制が可能です。

![gif](https://raw.githubusercontent.com/ChenCMD/MC-Datapacmc-datapack-utilityk-Utility/master/images/scoreOperation.gif)

# 推奨事項

VSCodeでDatapackを作成する際は[Datapack Helper Plus](https://marketplace.visualstudio.com/items?itemName=SPGoding.datapack-language-server)の併用をお勧めします。

この拡張機能はDatapackに関する包括的なサポートを行っており、非常に便利です。

# Special Thanks

[藪](https://twitter.com/Yavu_Minecraft)氏にMC Datapack Utilityのアイコン/バナーを作成していただきました。
この場をお借りしてお礼申し上げます。