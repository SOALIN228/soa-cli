'use strict'

const path = require('path')
const semver = require('semver')
const colors = require('colors')
const userHome = require('user-home')
const pathExists = require('path-exists').sync
const commander = require('commander')

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
    if (program.opts().debug) {
      console.log(e)
    }
  }
}

async function prepare () {
  checkPkgVersion()
  checkRoot()
  checkUserHome()
  checkEnv()
  await checkGlobalUpdate()
}

// 脚手架命令处理
function registerCommand () {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage('<command> [options]')
    .version(pkg.version)
    .option('-d, --debug', '是否开启调试模式', false)
    .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径', '')

  // 注册init命令
  program
    .command('init [projectName]')
    .option('-f, --force', '是否强制初始化项目')
    .action(exec)

  // 开启debug模式
  program.on('option:debug', function () {
    if (program.opts().debug) {
      process.env.LOG_LEVEL = 'verbose'
    } else {
      process.env.LOG_LEVEL = 'info'
    }
    // 修改log level 用于debug调试
    log.level = process.env.LOG_LEVEL
  })

  // 指定targetPath
  program.on('option:targetPath', function () {
    process.env.CLI_TARGET_PATH = this.opts().targetPath
  })

  // 对未知命令监听
  program.on('command:*', function (obj) {
    const availableCommands = program.commands.map(cmd => cmd.name())
    console.log(colors.red('未知的命令：' + obj[0]))
    if (availableCommands.length > 0) {
      console.log(colors.red('可用命令：' + availableCommands.join(',')))
    }
  })

  program.parse(process.argv)
  // 未输入命令时，打印帮助文档
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
  // 最新版本
  const latestVersion = await getNpmSemverVersion(currentVersion, npmName)
  // 是否存在最新版本提示
  if (latestVersion && semver.gt(latestVersion, currentVersion)) {
    log.warn(
      colors.yellow(`请手动更新${npmName}, 当前版本:${currentVersion}, 最新版本: ${latestVersion}
                  更新命令: npm install -g ${npmName}
        `)
    )
  }
}

// 检查环境变量
function checkEnv () {
  const dotenv = require('dotenv')
  const dotenvPath = path.resolve(userHome, '.env')
  // 存在环境变量
  if (pathExists(dotenvPath)) {
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
  // 对root账号（sudo）启动的命令进行降级
  // 判断geteuid是否为0（root），如果为0对uid和gid进行修改
  const rootCheck = require('root-check')
  rootCheck()
}

// 检查脚手架版本信息
function checkPkgVersion () {
  log.success('notice', pkg.version)
}
