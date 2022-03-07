![Banner](https://raw.githubusercontent.com/ChenCMD/MC-Datapack-Utility/master/images/banner.png)

[![license](https://img.shields.io/github/license/ChenCMD/MC-Datapack-Utility)](https://github.com/ChenCMD/MC-Datapack-Utility/blob/master/LICENSE)
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
  - [複数行の一括入力](#複数行の一括入力)
    - [文字列](#文字列)
    - [データパックタグ](#データパックタグ)
    - [連続した値](#連続した値)
    - [数式](#数式)
  - [計算式のscore operationへの変換](#計算式のscore-operationへの変換)
- [推奨事項](#推奨事項)
- [謝辞](#謝辞)
- [コントリビュートについて](#コントリビュートについて)

# 免責事項

> [MITライセンス](https://github.com/ChenCMD/MC-Datapack-Utility/blob/master/LICENSE)

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

## 複数行の一括入力

何らかの規則性のある複数行を記述するのが面倒？

`Alt + Shift + D -> Alt + Shift + M`を押しましょう。
この機能を使うと、いくつかの質問に答えるだけで複数行をカーソルの位置に生成することができます。

選択によって最初の質問の`%r`の置換方法が変わります。以下はその種類です。

### 文字列

`%r`を自由な文字列で置換します。
入力された文字列は行毎に解釈され、置換されます。

この置換方法はカーソルの個数によって挙動が異なるため注意してください。

#### カーソルの個数による生成時の挙動の差異

| カーソルが一個の時の挙動                 | カーソルが複数個の時の挙動                                                                                                                         |
| :--------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| カーソルの行を始めとして入力行数だけ生成 | 入力行数とカーソルの数が異なる場合: それぞれの箇所に入力内容が生成<br/>入力行数とカーソルの数が同一の場合: カーソルの配置順に入力内容を1行ずつ生成 |

### データパックタグ

`%r`をデータパックタグの`values`で置換します。

この置換方法はカーソルの個数によって挙動が異なるため注意してください。

#### カーソルの個数による生成時の挙動の差異

| カーソルが一個の時の挙動                     | カーソルが複数個の時の挙動                                                                                                                                     |
| :------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| カーソルの行を始めとしてタグの要素数だけ生成 | タグの要素数とカーソルの数が異なる場合: それぞれの箇所にタグの要素が生成<br/>タグの要素数とカーソルの数が同一の場合: カーソルの配置順にタグの要素を1行ずつ生成 |

### 連続した値

`%r`を一定の連続した値で置換します。

注意事項: `値を先頭埋めする長さ`が`-1`の場合、先頭埋めは行われません。

### 数式

`%r`を関数より算出される値で置換します。
`Math.min(<a>,<b>)`や`Math.floor(<a>)`などが利用可能です。
<!-- つまるところJavaScriptとして評価しちゃってる、ってことですネ -->

注意事項: `値を先頭埋めする長さ`が`-1`の場合、先頭埋めは行われません。

<!-- TODO ![gif](https://raw.githubusercontent.com/ChenCMD/MC-Datapack-Utility/master/images/multiLineGenerator.gif) -->

## 計算式のscore operationへの変換

scoreboard players operationで計算式を作るのが面倒？

`Alt + Shift + D -> Alt + Shift + S`を押しましょう。
選択範囲がある場合はその選択範囲を、ない場合は入力した式を`scoreboard players operation`に変換します。

また、configからデフォルトで使用するObjectやスコアホルダーのPrefix、式のInput方法の強制が可能です。

![gif](https://raw.githubusercontent.com/ChenCMD/MC-Datapack-Utility/master/images/scoreOperation.gif)

# 推奨事項

VSCodeでDatapackを作成する際は[Datapack Helper Plus](https://marketplace.visualstudio.com/items?itemName=SPGoding.datapack-language-server)の併用をお勧めします。

この拡張機能はDatapackに関する包括的なサポートを行っており、非常に便利です。

# 謝辞

[藪](https://twitter.com/Yavu_8B)氏にMC Datapack Utilityのアイコン/バナーを作成していただきました。
この場をお借りしてお礼申し上げます。

# コントリビュートについて

もしこの拡張機能にバグや要望がある場合や他言語への翻訳を手伝っていただける場合は[CONTRIBUTING.md](CONTRIBUTING_ja.md)を確認してください！