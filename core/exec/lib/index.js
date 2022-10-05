'use strict'
const path = require('path')
const Package = require('@soa-cli/package')
const log = require('@soa-cli/log')
const { exec: spawn } = require('@soa-cli/utils')

const SETTINGS = {
  init: '@soa-cli/init', publish: '@soa-cli/publish',
}
const CACHE_DIR = 'dependencies'

async function exec () {
  let targetPath = process.env.CLI_TARGET_PATH
  const homePath = process.env.CLI_HOME_PATH
  let storeDir = ''
  let pkg
  log.verbose('targetPath', targetPath)
  log.verbose('homePath', homePath)

  // 获取输入的命令信息
  const cmdObj = arguments[arguments.length - 1]
  // 获取命令名称
  const cmdName = cmdObj.name()
  // 根据命令名称，获取将要加载的包名
  const packageName = SETTINGS[cmdName]
  const packageVersion = 'latest'

  if (!targetPath) {
    // 未指定本地调试路径,采用缓存策略
    // 将targetPath 指向到用户目录下的dependencies
    targetPath = path.resolve(homePath, CACHE_DIR)
    // 生成缓存路径
    storeDir = path.resolve(targetPath, 'node_modules')
    log.verbose('targetPath', targetPath)
    log.verbose('storeDir', storeDir)
    pkg = new Package({
      targetPath, storeDir, packageName, packageVersion
    })
    if (await pkg.exists()) {
      // 安装过pkg，执行更新逻辑，检测是否存在最新版本
      await pkg.update()
    } else {
      // 未安装过pkg，安装pkg
      await pkg.install()
    }
  } else {
    // 指定本地调试路径
    pkg = new Package({
      targetPath, packageName, packageVersion
    })
  }
  // 获取当前pkg的入口文件（主文件）
  const rootFile = pkg.getRootFilePath()
  if (rootFile) {
    try {
      // 在当前进程中调用
      // require(rootFile).call(null, Array.from(arguments))
      // 在node子进程中调用
      const args = Array.from(arguments)
      // 获取command 相关参数信息
      const cmd = args[args.length - 1]
      // 对cmd进行瘦身，去除无用属性
      const o = Object.create(null)
      Object.keys(cmd).forEach(key => {
        // 过滤掉原型链上的属性、过滤掉以_开头的私有属性、过滤掉parent的属性
        if (cmd.hasOwnProperty(key) && !key.startsWith('_') && key !== 'parent') {
          o[key] = cmd[key]
        }
      })
      // 替换cmd
      args[args.length - 1] = o
      // 实现动态调用命令
      const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`
      // 对spawn做了操作系统的兼容
      const child = spawn('node', ['-e', code], {
        cwd: process.cwd(),
        // 将子进程的数据直接在父进程显示，而不是通过监听事件获取子进程数据
        stdio: 'inherit' // 默认为pipe
      })
      // 监听子进程错误事件
      child.on('error', e => {
        log.error(e.message)
        process.exit(1)
      })
      // 监听子进程退出事件
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
