![Banner](https://raw.githubusercontent.com/ChenCMD/MC-Datapack-Utility/master/images/banner.png)

[![license](https://img.shields.io/github/license/ChenCMD/MC-Datapack-Utility)](https://github.com/ChenCMD/MC-Datapack-Utility/blob/master/LICENCE)
[![Version](https://img.shields.io/visual-studio-marketplace/v/chencmd.mc-datapack-utility?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=chencmd.mc-datapack-utility)
[![LastUpdate](https://img.shields.io/visual-studio-marketplace/last-updated/chencmd.mc-datapack-utility?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=chencmd.mc-datapack-utility)
[![Download](https://img.shields.io/visual-studio-marketplace/d/chencmd.mc-datapack-utility?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=chencmd.mc-datapack-utility)
[![Install](https://img.shields.io/visual-studio-marketplace/i/chencmd.mc-datapack-utility?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=chencmd.mc-datapack-utility)
[![Gitmoji](https://img.shields.io/badge/gitmoji-%20😜%20😍-FFDD67.svg)](https://gitmoji.carloscuesta.me/)

English / [日本語](https://github.com/ChenCMD/MC-Datapack-Utility/blob/master/README_ja.md)

This extension provides several useful features for Datapack development.

- [Disclaimer](#Disclaimer)
- [How to Install](#How-to-Install)
- [Features](#Features)
  - [Creating a datapack template](#Creating-a-datapack-template)
  - [Copy resourcePath](#Copy-resourcePath)
  - [Quick file creation](#Quick-file-creation)
  - [Converting formulas to score operation](#Converting-formulas-to-score-operation)
- [Recommendations](#Recommendations)
- [Special Thanks](#Special-Thanks)

# Disclaimer

> [MIT license](https://github.com/ChenCMD/MC-Datapack-Utility/blob/master/LICENCE)

While we do our best to prevent damage to our files, it is possible that under rare, unforeseeable circumstances files may become corrupted.
We cannot be held responsible when this happens.

Please back up your important working data at all times. This is very important even if you are not using the MC Datapack Utility.

# How to Install

The MC Datapack Utility can be installed from the VSCode Marketplace
[![Version](https://img.shields.io/visual-studio-marketplace/v/chencmd.mc-datapack-utility?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=chencmd.mc-datapack-utility)

Another way is to press `Ctrl + P` on VSCode and execute `ext install chencmd.mc-datapack-utility`.

# Features
## Creating a datapack template

Want to make the creation of a data pack easier?

Press `Alt + Shift + D -> Alt + Shift + T`.
This feature makes creating a Datapack easy by simply answering a few questions in a flow.

You can also create your own datapack template from config.

![gif](https://raw.githubusercontent.com/ChenCMD/MC-Datapack-Utility/master/images/createDatapackTemplate.gif)

## Copy resourcePath

Want to get the resourcePath of a file easily?

Right-click on the file you want to get in Explorer and use `Copy ResourcePath`.

![image](https://raw.githubusercontent.com/ChenCMD/MC-Datapack-Utility/master/images/copyResourcePath_en.png)

## Quick file creation

Is it too much trouble to write a .mcfunction or .json file every time?

Right-click on the folder of the directory you want to create and use the `Create datapack file`.
This feature allows you to create a file by just typing in the file name and automatically completing the extension.

You can also set the default file contents for each file type from config.
You can create a file with the contents described by describing it.

![gif](https://raw.githubusercontent.com/ChenCMD/MC-Datapack-Utility/master/images/createFile.gif)

## Converting formulas to score operation

Too much trouble creating a formula in the scoreboard players operation?

Press `Alt + Shift + D -> Alt + Shift + S`.
If you have a selection, the selection is converted to a `scoreboard players operation`, if not, the expression is converted to a `scoreboard players operation`.

You can also use config to force the default Object and Prefix of the scoreholder and input method of the expression.

![gif](https://raw.githubusercontent.com/ChenCMD/MC-Datapack-Utility/master/images/scoreOperation.gif)

# Recommendations

We recommend using [Datapack Helper Plus](https://marketplace.visualstudio.com/items?itemName=SPGoding.datapack-language-server) when creating Datapack in VSCode.

This extension provides comprehensive support for Datapack and is very useful.

# Special Thanks

Thanks to [Yavu](https://twitter.com/Yavu_Minecraft) for creating the MC Datapack Utility icon/banner.
I'd like to take this opportunity to thank you.

# Contribution

## I have bugs or ideas!

[Open Issue](https://github.com/ChenCMD/MC-Datapack-Utility/issues/new) and share it with us!

Only one bug/idea in one Issue, and if it's a bug, create it with useful information to reproduce or fix!

## Localization

[![widget](https://l10n.spgoding.com/widgets/mc-datapack-utility/-/multi-auto.svg)](https://l10n.spgoding.com/engage/mc-datapack-utility/?utm_source=widget)

We are using the [SPGoding](https://github.com/SPGoding) website together for translation.

The MC Datapack Utility supports multiple languages,
so if you can translate this project into your language, it would make MCDU even better.

#### Steps
1. Go to the [localization website](https://l10n.spgoding.com/).
1. [Register](https://l10n.spgoding.com/accounts/register) by linking your GitHub account (recommended), or using your email.
  - Note that the username and email will be shown in the repository's git commit log. If you don't feel like you want to disclose your own email address, feel free to [contact SPGoding](https://github.com/SPGoding/datapack-language-server/wiki/Contact-SPGoding) to get an account with a fake email address.
1. See two components of MCDU [here](https://l10n.spgoding.com/projects/mc-datapack-utility).
1. Start translating!

#### Note
- If your language is not listed on the platform, simply contact [ChenCMD](https://github.com/ChenCMD/MC-Datapack-Utility/wiki/Contact);
- If you have suggestions for the source string (en-us), please [open an issue](https://github.com/ChenCMD/MC-Datapack-Utility/issues/new).