'use strict'

const fs = require('fs')
const path = require('path')
const fse = require('fs-extra')
const inquirer = require('inquirer')
const semver = require('semver')
const userHome = require('user-home')
const log = require('@soa-cli/log')
const Command = require('@soa-cli/command')
const Package = require('@soa-cli/package')
const { spinnerStart, sleep } = require('@soa-cli/utils')

const getProjectTemplate = require('./getProjectTemplate')

const TYPE_PROJECT = 'project'
const TYPE_COMPONENT = 'component'

class InitCommand extends Command {
  init () {
    this.projectName = this._argv[0] || ''
    this.force = !!this._cmd.force
    log.verbose('projectName', this.projectName)
    log.verbose('force', this.force)
  }

  async exec () {
    try {
      // 1. 准备阶段
      const projectInfo = await this.prepare()
      if (projectInfo) {
        log.verbose('projectInfo', projectInfo)
        this.projectInfo = projectInfo
        // 2. 下载模板
        await this.downloadTemplate()
      }
    } catch (e) {
      log.error(e.message)
      // if (process.env.LOG_LEVEL === 'verbose') {
      //   console.log(e)
      // }
    }
  }

  async downloadTemplate () {
    const { projectTemplate } = this.projectInfo
    const templateInfo = this.template.find(item => item.npmName === projectTemplate)
    // 模版存储路径
    const targetPath = path.resolve(userHome, '.soa-cli-dev', 'template')
    const storeDir = path.resolve(userHome, '.soa-cli-dev', 'template', 'node_modules')
    const { npmName, version } = templateInfo
    this.templateInfo = templateInfo
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    })
    if (!await templateNpm.exists()) {
      const spinner = spinnerStart('正在下载模板...')
      await sleep()
      try {
        await templateNpm.install()
      } catch (e) {
        throw e
      } finally {
        // 停止loading并清空loading文本
        spinner.stop(true)
        if (await templateNpm.exists()) {
          log.success('下载模板成功')
          this.templateNpm = templateNpm
        }
      }
    } else {
      const spinner = spinnerStart('正在更新模板...')
      await sleep()
      try {
        await templateNpm.update()
      } catch (e) {
        throw e
      } finally {
        spinner.stop(true)
        if (await templateNpm.exists()) {
          log.success('更新模板成功')
          this.templateNpm = templateNpm
        }
      }
    }
  }

  async prepare () {
    // 0. 判断项目模板是否存在
    const template = await getProjectTemplate()
    if (!template || template.length === 0) {
      throw new Error('项目模板不存在')
    }
    this.template = template
    // 1. 判断当前目录是否为空
    const localPath = process.cwd()
    // 文件夹不为空
    if (!this.isDirEmpty(localPath)) {
      let ifContinue = false
      // 未开启强制更新
      if (!this.force) {
        // 询问是否继续创建
        ifContinue = (await inquirer.prompt({
          type: 'confirm',
          name: 'ifContinue',
          default: false,
          message: '当前文件夹不为空，是否继续创建项目？',
        })).ifContinue
        // 创建终止
        if (!ifContinue) {
          return
        }
      }
      // 2. 是否启动强制更新
      if (ifContinue || this.force) {
        // 给用户做二次确认
        const { confirmDelete } = await inquirer.prompt({
          type: 'confirm',
          name: 'confirmDelete',
          default: false,
          message: '是否确认清空当前目录下的文件？',
        })
        if (confirmDelete) {
          // 清空当前目录
          fse.emptyDirSync(localPath)
        }
      }
    }
    return this.getProjectInfo()
  }

  async getProjectInfo () {
    function isValidName (v) {
      return /^(@[a-zA-Z0-9-_]+\/)?[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)
    }

    let projectInfo = {}
    // 1. 选择创建项目或组件
    const { type } = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: '请选择初始化类型',
      default: TYPE_PROJECT,
      choices: [{
        name: '项目',
        value: TYPE_PROJECT,
      }, {
        name: '组件',
        value: TYPE_COMPONENT,
      }],
    })
    const title = type === TYPE_PROJECT ? '项目' : '组件'
    const project = await inquirer.prompt([{
      type: 'input',
      name: 'projectName',
      message: `请输入${title}名称`,
      default: '',
      validate: function (v) {
        const done = this.async()
        setTimeout(function () {
          // 1.首字符必须为英文字符
          // 2.尾字符必须为英文或数字，不能为字符
          // 3.字符仅允许"-_"
          if (!isValidName(v)) {
            done(`请输入合法的${title}名称`)
            return
          }
          done(null, true)
        }, 0)
      },
      filter: function (v) {
        return v
      },
    }, {
      type: 'input',
      name: 'projectVersion',
      message: `请输入${title}版本号`,
      default: '1.0.0',
      validate: function (v) {
        const done = this.async()
        setTimeout(function () {
          if (!(!!semver.valid(v))) {
            done('请输入合法的版本号')
            return
          }
          done(null, true)
        }, 0)
      },
      filter: function (v) {
        // 版本号合法返回格式化后版本号（v1.0.0 -> 1.0.0），否则不处理
        if (!!semver.valid(v)) {
          return semver.valid(v)
        } else {
          return v
        }
      },
    }, {
      type: 'list',
      name: 'projectTemplate',
      message: `请选择${title}模板`,
      choices: this.createTemplateChoice(),
    }])
    projectInfo = {
      ...projectInfo,
      type,
      ...project,
    }
    return projectInfo
  }

  createTemplateChoice () {
    return this.template.map(item => ({
      value: item.npmName,
      name: item.name,
    }))
  }

  isDirEmpty (localPath) {
    let fileList = fs.readdirSync(localPath)
    // 文件过滤的逻辑(去掉 .开头 & node_modules)
    fileList = fileList.filter(file => (
      !file.startsWith('.') && !['node_modules'].includes(file)
    ))
    return !fileList || fileList.length <= 0
  }
}

function init (argv) {
  // log.verbose('argv', argv);
  return new InitCommand(argv)
}

module.exports = init
module.exports.InitCommand = InitCommand
