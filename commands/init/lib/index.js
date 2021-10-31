'use strict'

const fs = require('fs')
const path = require('path')
const fse = require('fs-extra')
const inquirer = require('inquirer')
const semver = require('semver')
const userHome = require('user-home')
const glob = require('glob')
const ejs = require('ejs')
const log = require('@soa-cli/log')
const Command = require('@soa-cli/command')
const Package = require('@soa-cli/package')
const { spinnerStart, sleep, execAsync } = require('@soa-cli/utils')

const getProjectTemplate = require('./getProjectTemplate')

const TYPE_PROJECT = 'project'
const TYPE_COMPONENT = 'component'

const TEMPLATE_TYPE_NORMAL = 'normal'
const TEMPLATE_TYPE_CUSTOM = 'custom'

const WHITE_COMMAND = ['npm', 'cnpm']

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
        // 3. 安装模板
        await this.installTemplate()
      }
    } catch (e) {
      log.error(e.message)
      if (process.env.LOG_LEVEL === 'verbose') {
        console.log(e)
      }
    }
  }

  async installTemplate () {
    log.verbose('templateInfo', this.templateInfo)
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL
      }
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate()
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安装
        // await this.installCustomTemplate()
      } else {
        throw new Error('无法识别项目模板类型！')
      }
    } else {
      throw new Error('项目模板信息不存在！')
    }
  }

  async installNormalTemplate () {
    log.verbose('templateNpm', this.templateNpm)
    // 拷贝模板代码至当前目录
    let spinner = spinnerStart('正在安装模板...')
    await sleep()
    const targetPath = process.cwd()
    try {
      const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template')
      // ensureDirSync检测文件路径是否存在
      fse.ensureDirSync(templatePath)
      fse.ensureDirSync(targetPath)
      fse.copySync(templatePath, targetPath)
    } catch (e) {
      throw e
    } finally {
      spinner.stop(true)
      log.success('模板安装成功')
    }
    const templateIgnore = this.templateInfo.ignore || []
    const ignore = ['**/node_modules/**', ...templateIgnore]
    await this.ejsRender({ ignore })
    const { installCommand, startCommand } = this.templateInfo
    // 依赖安装
    await this.execCommand(installCommand, '依赖安装失败！')
    // 启动命令执行
    await this.execCommand(startCommand, '启动执行命令失败！')
  }

  async ejsRender (options) {
    // 执行init命令的路径
    const dir = process.cwd()
    const projectInfo = this.projectInfo
    return new Promise((resolve, reject) => {
      // glob 获取指定目录下的所有文件名称
      glob('**', {
        cwd: dir,
        ignore: options.ignore || '',
        nodir: true, // 忽略文件夹
      }, function (err, files) {
        if (err) {
          reject(err)
        }
        Promise.all(files.map(file => {
          const filePath = path.join(dir, file)
          return new Promise((resolve1, reject1) => {
            ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
              if (err) {
                reject1(err)
              } else {
                // result是ejs渲染后的结果，但是不会写入文件中，需要通过writeFileSync进行渲染替换
                fse.writeFileSync(filePath, result)
                resolve1(result)
              }
            })
          })
        })).then(() => resolve())
          .catch((err) => reject(err))
      })
    })
  }

  async execCommand (command, errMsg) {
    let ret
    if (command) {
      const cmdArray = command.split(' ')
      const cmd = this.checkCommand(cmdArray[0])
      if (!cmd) {
        throw new Error('命令不存在！命令：' + command)
      }
      const args = cmdArray.slice(1)
      ret = await execAsync(cmd, args, {
        stdio: 'inherit',
        cwd: process.cwd(),
      })
    }
    if (ret !== 0) {
      throw new Error(errMsg)
    }
    return ret
  }

  // 检测命令是否在白名单中
  checkCommand (cmd) {
    if (WHITE_COMMAND.includes(cmd)) {
      return cmd
    }
    return null
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
    // 项目名称是在命令中存在且合法则跳过项目名输入环节，反之进入项目名输入环节
    let isProjectNameValid = false
    if (isValidName(this.projectName)) {
      isProjectNameValid = true
      projectInfo.projectName = this.projectName
    }
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
    this.template = this.template.filter(template => template.tag.includes(type))
    // 根据项目or组件生成对去的命令行提示
    const projectNamePrompt = {
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
    }
    const projectPrompt = []
    if (!isProjectNameValid) {
      projectPrompt.push(projectNamePrompt)
    }
    projectPrompt.push({
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
        // 版本号合法进行格式化，反之不处理
        if (!!semver.valid(v)) {
          // 格式化版本号，v1.0.0 -> 1.0.0
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
    })
    if (type === TYPE_COMPONENT) {
      const descriptionPrompt = {
        type: 'input',
        name: 'componentDescription',
        message: '请输入组件描述信息',
        default: '',
        validate: function (v) {
          const done = this.async()
          setTimeout(function () {
            if (!v) {
              done('请输入组件描述信息')
              return
            }
            done(null, true)
          }, 0)
        },
      }
      projectPrompt.push(descriptionPrompt)
    }
    // 2. 获取组件的基本信息
    const promptInfo = await inquirer.prompt(projectPrompt)
    projectInfo = {
      ...projectInfo,
      type,
      ...promptInfo,
    }

    // 处理ejs渲染需要的变量
    if (projectInfo.projectName) {
      projectInfo.name = projectInfo.projectName
      // 将项目名由驼峰转为中划线分割，SoaTemplate => soa-template
      projectInfo.className = require('kebab-case')(projectInfo.projectName).replace(/^-/, '')
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion
    }
    if (projectInfo.componentDescription) {
      projectInfo.description = projectInfo.componentDescription
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
