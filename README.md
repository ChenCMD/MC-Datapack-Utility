![Banner](https://raw.githubusercontent.com/ChenCMD/MC-Datapack-Utility/master/images/banner.png)

[![license](https://img.shields.io/github/license/ChenCMD/MC-Datapack-Utility)](https://github.com/ChenCMD/MC-Datapack-Utility/blob/master/LICENSE)
[![Version](https://img.shields.io/visual-studio-marketplace/v/chencmd.mc-datapack-utility?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=chencmd.mc-datapack-utility)
[![LastUpdate](https://img.shields.io/visual-studio-marketplace/last-updated/chencmd.mc-datapack-utility?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=chencmd.mc-datapack-utility)
[![Download](https://img.shields.io/visual-studio-marketplace/d/chencmd.mc-datapack-utility?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=chencmd.mc-datapack-utility)
[![Install](https://img.shields.io/visual-studio-marketplace/i/chencmd.mc-datapack-utility?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=chencmd.mc-datapack-utility)
[![Gitmoji](https://img.shields.io/badge/gitmoji-%20😜%20😍-FFDD67.svg)](https://gitmoji.carloscuesta.me/)

English / [日本語](https://github.com/ChenCMD/MC-Datapack-Utility/blob/master/README_ja.md)

This extension provides several useful features for Datapack development.

- [Disclaimer](#disclaimer)
- [How to Install](#how-to-install)
- [Features](#features)
  - [Creating a datapack template](#creating-a-datapack-template)
  - [Copy resourcePath](#copy-resourcepath)
  - [Quick file creation](#quick-file-creation)
  - [Batch input of multiple lines](#batch-input-of-multiple-lines)
    - [Strings](#strings)
    - [Datapack tag](#datapack-tag)
    - [Consecutive values](#consecutive-values)
    - [Expression](#expression)
  - [Converting formulas to score operation](#converting-formulas-to-score-operation)
- [Recommendations](#recommendations)
- [Special Thanks](#special-thanks)
- [Contribution](#contribution)

# Disclaimer

> [MIT license](https://github.com/ChenCMD/MC-Datapack-Utility/blob/master/LICENSE)

While we do our best to prevent damage to our files, it is possible that under rare, unforeseeable circumstances files may become corrupted.
We cannot be held responsible when this happens.

Please back up your important working data at all times. This is very important even if you are not using the MC Datapack Utility.

# How to Install

The MC Datapack Utility can be installed from the VSCode Marketplace
[![Version](https://img.shields.io/visual-studio-marketplace/v/chencmd.mc-datapack-utility?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=chencmd.mc-datapack-utility)

Another way is to press `Ctrl + P` on VSCode and execute `ext install chencmd.mc-datapack-utility`.

# Features
## Creating a datapack template

Want to make the creation of a datapack easier?

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

## Batch input of multiple lines

Having trouble describing multiple lines with some regularity?

Press `Alt + Shift + D -> Alt + Shift + M`.
This function allows you to generate multiple lines at the cursor position by simply answering a few questions.

Depending on your choice, the method of replacing the `%r` in the first question will change. Here are the types

### Strings

Replace `%r` with any string.
The input string is interpreted line by line and replaced.

Note that this substitution method behaves differently depending on the number of cursors.

#### Difference in behavior when generating depending on the number of cursors

| Behavior with a single cursor                                           | Behavior with multiple cursors                                                                                                                                                                                                                                             |
| :---------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generate as many input lines as there are starting with the cursor line | If the number of input lines and the number of cursors are different:<br/> input content is generated at each location<br/>If the number of input lines and the number of cursors are the same:<br/> input content is generated one line at a time in the order of cursor placement. |

### Datapack tag

Replace `%r` with the data pack tag `values`.

Note that this substitution method behaves differently depending on the number of cursors.

#### Difference in behavior when generating depending on the number of cursors

| Behavior with a single cursor                                             | Behavior with multiple cursors                                                                                                                                                                                                                                   |
| :------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generate as many tag elements as there are, starting with the cursor line | If the number of tag elements and the cursor are different:<br/> a tag element is generated at each location<br/>If the number of tag elements and the cursor are the same:<br/> a tag element is generated one line at a time in the order in which the cursor is placed. |

### Consecutive values

Replace `%r` with a constant, continuous value.

Note: If the `Length to pad the value at the beginning` is `-1`, no prefill is performed.

### Expression

Replace `%r` with the value calculated from the expression.
`Math.min(<a>,<b>)`, `Math.floor(<a>)`, etc. are available.

Note: If the `Length to pad the value at the beginning` is `-1`, no prefill is performed.

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

Thanks to [Yavu](https://twitter.com/Yavu_8B) for creating the MC Datapack Utility icon/banner.
I'd like to take this opportunity to thank you.

# Contribution

Please check [CONTRIBUTING.md](CONTRIBUTING.md) if you have any bugs or requests for this extension, or if you want to help translating it into other languages!