import { Uri, window } from 'vscode'
import * as file from '../utils/file'
import * as common from '../utils/common'
import path = require('path')

export async function createFile(uri: Uri) {
    const datapackRoot = await common.getFileRoot(uri.fsPath)
    if (!datapackRoot) {
        window.showErrorMessage('Cannot create file because it is not a datapack.')
        return
    }
    const fileType = await common.getFileType(uri.fsPath, datapackRoot)
    if (!fileType) {
        window.showErrorMessage('You can\'t create a file here.')
        return
    }
    if (fileType === 'structure') {
        window.showErrorMessage('Structure files are not supported.')
        return
    }
    // window.showInformationMessage(fileType)

    const fileExtension = fileType === 'function' ? '.mcfunction' : '.json'

    const fileName = await window.showInputBox({
        value: '',
        placeHolder: '',
        prompt: 'Function name?',
        validateInput: async value => {
            if (!value.match(/^[a-z0-9\.\/\_\-]*$/))
                return 'Characters other than [a-z0-9./_-] exist.'
            if (await file.pathAccessible(path.join(uri.fsPath, value + fileExtension)))
                return 'This ' + fileType + ' already exists.'
        }
    }).then(value => value)

    if (!fileName) return
    const filePath = path.join(uri.fsPath, fileName)
    const resourcePath = await common.getResourcePath(filePath, datapackRoot)
    const fileTemplate = await common.getFileTemplate(fileType, resourcePath)

    file.create(filePath + fileExtension, fileTemplate)
}