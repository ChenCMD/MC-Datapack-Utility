import type { Config, CreateDatapackTemplateConfig } from '../../../types/Config'
import type { JsonObject } from '../../../types/JsonObject'
import { GenerateError, UserCancelledError } from '../../../types/Error'
import { resolveVars, Variables } from '../../../core/templates/variables'
import { isStringArray } from '../../../utils/typeGuards'
import { ObjectSet } from '../../../utils/ObjectSet'
import { dataFolder, packMcMetaData } from '../utils/data'
import type { CustomQuestion, GenerateFileData, QuickPickFiles } from '../types/QuickPickFiles'
import type { DatapackPorts, GenerationResult } from './ports'
import { cloneTemplate } from './templates'
import rfdc from 'rfdc'

export const createDatapackCommand = <U>(ports: DatapackPorts<U>) => {
  const createDatapack = async ({ env: { dataVersion, dateFormat }, createDatapackTemplate }: Config, generateType?: 'add' | 'create'): Promise<void> => {
    try {
      const generatorChildNode = await ports.selectGenerator(generateType)
      // ディレクトリ
      const dir = await generatorChildNode.listenGenerateDir()
      // データパック名とroot
      const { name, root } = await generatorChildNode.listenDatapackNameAndRoot(dir)
      // データパックのpack_format
      const packFormat = await generatorChildNode.listenPackFormat(root)
      // データパックのdescription
      const datapackDescription = await generatorChildNode.listenDatapackDescription(dir)
      // 名前空間
      const namespace = await listenNamespace()
      // 変数の作成
      const vars: Variables = {
        date: ports.getDate(dateFormat),
        dir: ports.getFsPath(dir),
        datapackName: name,
        datapackRoot: ports.getFsPath(root),
        packFormat: packFormat.toString(),
        datapackDescription,
        namespace
      }
      // テンプレートの選択
      const createItems = await listenGenerateTemplate(vars, createDatapackTemplate, packFormat)
      // カスタムの質問
      const customVars = await listenCustomQuestion(new ObjectSet(createItems.flatMap(v => v.customQuestion ?? [])))
      // 生成用のデータに加工する
      const items = await toGenerateData(createItems, generatorChildNode.isGeneratePackMcMeta, dataVersion, packFormat)
      // 生成
      const result = await generate(items, root, packFormat, { ...vars, ...customVars })
      if (result.failed === 0) {
        await generatorChildNode.noticeGenerated(root)
      } else {
        // A successful implicit data directory does not mean any requested file succeeded.
        const successful = result.files > 0 ? result.successfulFiles : result.successfulFolders
        if (successful > 0) ports.showWarning(ports.locale('create-datapack-template.generation-partial', result.failed))
        else ports.showError(ports.locale('create-datapack-template.generation-failed', result.failed))
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error instanceof UserCancelledError) return
      if (error instanceof Error) ports.showError(error.message)
      else ports.showError(error.toString())
      ports.log(error.stack ?? error.toString())
    }
  }

  const listenNamespace = async (): Promise<string> => await ports.listenInput(
    ports.locale('create-datapack-template.namespace-name'),
    v => ports.stringValidator(v, { invalidCharRegex: /[^a-z0-9./_-]/g, emptyMessage: ports.locale('error.input-blank', ports.locale('create-datapack-template.namespace-name')) })
  )

  const listenCustomQuestion = async (questions: ObjectSet<CustomQuestion>): Promise<Variables> => {
    const ans: Variables = {}
    for (const question of questions) {
      let patternChecker: ((str: string) => string | undefined) | undefined = undefined
      if (question.pattern) {
        patternChecker = (str: string) => new RegExp(`^${question.pattern}$`).test(str)
          ? undefined
          : question.patternErrorMessage ?? ports.locale('create-datapack-template.pattern-error-default', `^${question.pattern}$`)
      }

      ans[question.name] = await ports.listenInput(question.question, patternChecker)
    }
    return ans
  }

  const listenGenerateTemplate = async (vars: Variables, config: CreateDatapackTemplateConfig, packFormat: number): Promise<QuickPickFiles[]> => {
    const items: QuickPickFiles[] = []
    if (config.defaultLoadAndTick || config.defaultVanillaData || config.defaultFolder) {
      const defaultItems = rfdc()(ports.defaultTemplates(packFormat))
      if (config.defaultLoadAndTick) items.push(...defaultItems['#load & #tick'])
      if (config.defaultVanillaData) items.push(...defaultItems['Vanilla data'])
      if (config.defaultFolder) items.push(...defaultItems['Folders'])
    }
    // Variable expansion mutates labels and JSON; each run owns its template copies.
    items.push(...cloneTemplate(config.customTemplate))
    items.forEach(v => v.label = resolveVars(v.label, vars))
    return await ports.listenPickItem(ports.locale('create-datapack-template.quickpick-placeholder'), items, true)
  }

  const toGenerateData = async (createItems: QuickPickFiles[], isGeneratePackMcMeta: boolean, dataVersion: string, packFormat: number): Promise<GenerateFileData[]> => {
    const ans = createItems.flatMap(v => v.generates)
    const funcs = createItems.filter(v => v.func !== undefined).flatMap(v => v.func!)

    ans.push(rfdc()(dataFolder))
    if (isGeneratePackMcMeta) ans.push(packMcMetaData(packFormat))

    for (const [i, func] of funcs.entries()) {
      await ports.createProgressBar(
        ports.locale('create-datapack-template.progress.title'),
        async report => {
          const message = ports.locale('create-datapack-template.progress.download', i + 1, funcs.length)
          report({ message })

          const res = await ports.getVanillaData(
            dataVersion,
            func,
            func.rel,
            (_, m) => report({ increment: 100 / m, message })
          )

          ans.push(...res.map<GenerateFileData>(fileData => ({ type: 'file', ...fileData })))
        }
      )
    }

    return ans
  }

  const generate = async (items: GenerateFileData[], root: U, packFormat: number, vars: Variables): Promise<GenerationResult> => {
    const result: GenerationResult = { files: items.filter(item => item.type === 'file').length, successfulFiles: 0, successfulFolders: 0, failed: 0 }
    await ports.createProgressBar(ports.locale('create-datapack-template.progress.title'), async report => {
      const message = ports.locale('create-datapack-template.progress.creating')
      report({ message })

      for (const item of items) {
        try {
          await singleGenerate(item, root, packFormat, vars)
          if (item.type === 'file') result.successfulFiles++
          else result.successfulFolders++
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          result.failed++
          if (error instanceof Error) ports.showError(error.message)
          else ports.showError(error.toString())
          ports.log(error.stack ?? error.toString())
        } finally {
          report({ increment: 100 / items.length, message })
        }
      }
    })
    return result
  }

  const singleGenerate = async (item: GenerateFileData, root: U, packFormat: number, vars: Variables): Promise<void> => {
    const fileUri = ports.joinPath(root, resolveVars(item.rel, vars))

    if (item.type === 'folder') {
      await ports.createDirectory(fileUri)
      return
    }
    if (item.type === 'file') {
      const indent = ' '.repeat(ports.getIndent(fileUri))

      if (!await ports.pathAccessible(fileUri)) {
        const singleVars = { fileResourcePath: ports.getResourcePath(fileUri, root, packFormat), ...vars }
        const contents = isStringArray(item.content)
          ? resolveVars(item.content, singleVars).join('\r\n')
          : JSON.stringify(resolveVars(item.content, singleVars), undefined, indent)

        await ports.createFile(fileUri, contents ?? '')
      } else if (item.append) {
        const { key, elem, addFirst } = item.append
        const fileContent = await ports.readFile(fileUri)

        if (ports.getPath(fileUri).endsWith('.json')) {
          const parsedJson = JSON.parse(fileContent) as JsonObject

          const res = ports.appendElemFromKey(parsedJson, key, resolveVars(elem, vars), addFirst ?? false)
          if (!res[0]) throw new GenerateError(ports.locale(res[1], ports.getFsPath(fileUri), key))

          await ports.writeFile(fileUri, JSON.stringify(parsedJson, undefined, indent))
        } else {
          if (addFirst)
            await ports.writeFile(fileUri, resolveVars(elem, vars) + fileContent)
          else
            await ports.writeFile(fileUri, fileContent + resolveVars(elem, vars))
        }
      }
    }
  }
  return createDatapack
}
