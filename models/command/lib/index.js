'use strict'

const semver = require('semver')
const colors = require('colors')
const log = require('@soa-cli/log')

const LOWEST_NODE_VERSION = '12.0.0'

class Command {
  constructor (argv) {
    if (!argv) {
      throw new Error('参数不能为空！')
    }
    if (!Array.isArray(argv)) {
      throw new Error('参数必须为数组！')
    }
    if (argv.length < 1) {
      throw new Error('参数列表为空！')
    }
    this._argv = argv
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve()
      chain = chain.then(() => this.checkNodeVersion())
      chain = chain.then(() => this.initArgs())
      chain = chain.then(() => this.init())
      chain = chain.then(() => this.exec())
      chain = chain.then(resolve)
      chain.catch(err => {
        log.error(err.message)
        reject(err)
      })
    })
  }

  // 格式化初始参数
  initArgs () {
    // 获取输入参数
    this._cmd = this._argv[1]
    this._argv = this._argv.slice(0, this._argv.length - 1)
    // log.verbose('initArgs', this._cmd, this._argv)
  }

  // 检查Node版本信息
  checkNodeVersion () {
    const currentVersion = process.version
    // 最低版本号
    const lowestVersion = LOWEST_NODE_VERSION
    if (!semver.gte(currentVersion, lowestVersion)) {
      throw new Error(colors.red(`soa-cli 需要安装 v${lowestVersion} 以上版本的 Node.js`))
    }
  }

  init () {
    throw new Error('init必须实现！')
  }

  exec () {
    throw new Error('exec必须实现！')
  }
}

module.exports = Command

