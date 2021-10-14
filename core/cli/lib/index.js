'use strict'

const path = require('path')
const semver = require('semver')
const colors = require('colors')
const userHome = require('user-home')
const pathExists = require('path-exists').sync

const log = require('@soa-cli/log')
const pkg = require('../package.json')
const constant = require('./const')

module.exports = core

// 入参
let args

async function core () {
  try {
    checkPkgVersion()
    checkNodeVersion()
    checkRoot()
    checkUserHome()
    checkInputArgs()
    checkEnv()
    await checkGlobalUpdate()
  } catch (e) {
    log.error(e.message)
  }
}

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
  log.verbose('环境变量', process.env.CLI_HOME_PATH)
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

function checkInputArgs () {
  args = require('minimist')(process.argv.slice(2))
  checkArgs()
}

function checkArgs () {
  if (args.debug) {
    process.env.LOG_LEVEL = 'verbose'
  } else {
    process.env.LOG_LEVEL = 'info'
  }
  // 修改log level 用于debug调试
  log.level = process.env.LOG_LEVEL
}

function checkUserHome () {
  // 检查类似/Users/soalin 的用户主目录是否存在
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('当前用户主目录不存在，请检查!'))
  }
}

function checkRoot () {
  // 对root账号（sudo）启动的命令进行降级
  // 判断geteuid是否为0（root），如果为0对uid和gid进行修改
  const rootCheck = require('root-check')
  rootCheck()
}

function checkPkgVersion () {
  log.success('notice', pkg.version)
}

function checkNodeVersion () {
  const currentVersion = process.version
  // 最低版本号
  const lowestVersion = constant.LOWEST_NODE_VERSION
  if (!semver.gte(currentVersion, lowestVersion)) {
    throw new Error(colors.red(`soa-cli 需要安装 v${lowestVersion} 以上版本的 Node.js`))
  }
}
