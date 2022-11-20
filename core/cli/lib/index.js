'use strict'

const path = require('path')
const semver = require('semver')
const colors = require('colors')
const userHome = require('user-home')
const pathExists = require('path-exists').sync
const commander = require('commander')
// 内部依赖
const log = require('@soa-cli/log')
const exec = require('@soa-cli/exec')
const pkg = require('../package.json')
const constant = require('./const')

const program = new commander.Command()

module.exports = core

async function core () {
  try {
    await prepare()
    registerCommand()
  } catch (e) {
    log.error(e.message)
    // 开启debug时，打印错误信息
    if (program.opts().debug) {
      console.log(e)
    }
  }
}

// 脚手架执行前的相关操作
async function prepare () {
  checkPkgVersion()
  checkRoot()
  checkUserHome()
  checkEnv()
  await checkGlobalUpdate()
}

// 脚手架命令注册
function registerCommand () {
  program
    .name(Object.keys(pkg.bin)[0]) // 设置脚手架名称
    .usage('<command> [options]') // 设置首行提示信息
    .version(pkg.version, '-V, --version', '输出版本号') // 设置-V 时的版本信息和提示
    .helpOption('-h, --help', '显示命令的提示') // 设置-v是版本信息和提示
    .option('-d, --debug', '是否开启调试模式', false) // 声明全局option
    .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径', '')

  // 注册init命令
  program
    .command('init [projectName]')
    .option('-f, --force', '是否强制初始化项目') // init 命令专属option
    .action(exec)

  // 注册publish命令
  program
    .command('publish')
    .option('--refreshServer', '强制更新远程Git仓库') // publish 命令专属option
    .option('--refreshToken', '强制更新远程仓库token')
    .option('--refreshOwner', '强制更新远程仓库类型')
    .action(exec)

  // 监听targetPath
  program.on('option:targetPath', function () {
    // 将targetPath写入环境变量，方便不同层级的command获取
    process.env.CLI_TARGET_PATH = this.opts().targetPath
  })

  // 监听option中的debug
  program.on('option:debug', function () {
    // 开启debug模式
    if (program.opts().debug) {
      process.env.LOG_LEVEL = 'verbose'
    } else {
      process.env.LOG_LEVEL = 'info'
    }
    log.level = process.env.LOG_LEVEL
  })

  // 对未知命令监听
  program.on('command:*', function (obj) {
    const availableCommands = program.commands.map(cmd => cmd.name())
    console.log(colors.red('未知的命令：' + obj[0]))
    // 展示可执行命令
    if (availableCommands.length > 0) {
      console.log(colors.red('可用命令：' + availableCommands.join(',')))
    }
  })

  program.parse(process.argv) // 将参数传递给脚手架
  // 未输入命令时(或只输入option)，打印帮助文档
  if (program.args && program.args.length < 1) {
    program.outputHelp()
    console.log() // 打印空行
  }
}

// 检查脚手架版本信息
async function checkGlobalUpdate () {
  // 获取当前版本号和模块名
  const currentVersion = pkg.version
  const npmName = pkg.name
  // 调用npm API 获取所以版本号
  const { getNpmSemverVersion } = require('@soa-cli/get-npm-info')
  // 检查是否存在最新版本，存在返回版本号
  // todo 本地开发网络卡顿，先注释
  // const latestVersion = await getNpmSemverVersion(currentVersion, npmName)
  // // 是否存在最新版本提示
  // if (latestVersion && semver.gt(latestVersion, currentVersion)) {
  //   log.warn(
  //     colors.yellow(`请手动更新${npmName}, 当前版本:${currentVersion}, 最新版本: ${latestVersion}
  //                 更新命令: npm install -g ${npmName}
  //       `)
  //   )
  // }
}

// 检查环境变量
function checkEnv () {
  const dotenv = require('dotenv')
  const dotenvPath = path.resolve(userHome, '.env')
  // 是否存在环境变量配置文件
  if (pathExists(dotenvPath)) {
    // 将.env中的配置设置到process.env中
    dotenv.config({
      path: dotenvPath
    })
  }
  createDefaultConfig()
}

// 创建默认的环境变量配置
function createDefaultConfig () {
  const cliConfig = {
    home: userHome
  }
  if (process.env.CLI_HOME) {
    cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME)
  } else {
    cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME)
  }
  process.env.CLI_HOME_PATH = cliConfig.cliHome
}

// 检查用户主目录是否存在，类似/Users/soalin
function checkUserHome () {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('当前用户主目录不存在，请检查!'))
  }
}

// 检查是否通过root权限执行脚手架
function checkRoot () {
  // 对root账号（sudo）启动的命令进行降级，避免普通用户无法读写执行，root账号创建的内容
  // 判断geteuid是否为0（root），如果为0对uid和gid进行修改
  const rootCheck = require('root-check')
  rootCheck()
}

// 检查脚手架版本信息
function checkPkgVersion () {
  log.success('notice', pkg.version)
}
