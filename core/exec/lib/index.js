'use strict'
const path = require('path')
const Package = require('@soa-cli/package')
const log = require('@soa-cli/log')
const { exec: spawn } = require('@soa-cli/utils')

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
    try {
      // 在当前进程中调用
      // require(rootFile).call(null, Array.from(arguments));
      // 在node子进程中调用
      const args = Array.from(arguments)
      const cmd = args[args.length - 1]
      // 对args的最后一个对象进行过滤
      const o = Object.create(null)
      Object.keys(cmd).forEach(key => {
        if (cmd.hasOwnProperty(key) && !key.startsWith('_') && key !== 'parent') {
          o[key] = cmd[key]
        }
      })
      args[args.length - 1] = o

      // 根据rootFile获取命令调用路径，实现动态调用命令
      const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`
      const child = spawn('node', ['-e', code], {
        cwd: process.cwd(),
        stdio: 'inherit'
      })
      child.on('error', e => {
        log.error(e.message)
        process.exit(1)
      })
      child.on('exit', e => {
        log.verbose('命令执行成功:' + e)
        process.exit(e)
      })
    } catch (e) {
      log.error(e.message)
    }
  }
}

module.exports = exec
