'use strict'
const path = require('path')
const Package = require('@soa-cli/package')
const log = require('@soa-cli/log')

const SETTINGS = {
  init: '@soa-cli/utils',
}
const CACHE_DIR = 'dependencies'

async function exec () {
  let targetPath = process.env.CLI_TARGET_PATH
  const homePath = process.env.CLI_HOME_PATH
  let storeDir = ''
  let pkg
  log.verbose('targetPath', targetPath)
  log.verbose('homePath', homePath)

  const cmdObj = arguments[arguments.length - 1]
  const cmdName = cmdObj.name()
  const packageName = SETTINGS[cmdName]
  const packageVersion = 'latest'

  /**
   * 是否指定命令执行路径
   */
  if (!targetPath) {
    /**
     * 未指定命令执行路径，采用缓存策略
     * 未安装过，存储到用户目录下
     * 安装过，检测是否存在最新版本，更新命令package
     */
    targetPath = path.resolve(homePath, CACHE_DIR) // 生成缓存路径
    storeDir = path.resolve(targetPath, 'node_modules')
    log.verbose('targetPath', targetPath)
    log.verbose('storeDir', storeDir)
    pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion
    })
    if (await pkg.exists()) {
      // 更新package
      await pkg.update()
    } else {
      // 安装package
      await pkg.install()
    }
  } else {
    /**
     * 指定命令执行路径
     */
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion
    })
  }
  const rootFile = pkg.getRootFilePath()
  if (rootFile) {
    require(rootFile).apply(null, arguments)
  }
}

module.exports = exec
