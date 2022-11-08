'use strict'

const fs = require('fs')

function isObject (o) {
  return Object.prototype.toString.call(o) === '[object Object]'
}

/**
 * 兼容mac和win的spawn
 */
function exec (command, args, options) {
  const win32 = process.platform === 'win32'

  const cmd = win32 ? 'cmd' : command
  const cmdArgs = win32 ? ['/c'].concat(command, args) : args

  return require('child_process').spawn(cmd, cmdArgs, options || {})
}

/**
 * exec的promise版本
 */
function execAsync (command, args, options) {
  return new Promise((resolve, reject) => {
    const p = exec(command, args, options)
    p.on('error', e => {
      reject(e)
    })
    p.on('exit', c => {
      resolve(c)
    })
  })
}

/**
 * 命令行loading效果
 * @param msg 提示文本
 * @param spinnerString loading内容
 */
function spinnerStart (msg, spinnerString = '|/-\\') {
  const Spinner = require('cli-spinner').Spinner
  const spinner = new Spinner(msg + ' %s')
  spinner.setSpinnerString(spinnerString)
  spinner.start()
  return spinner
}

/**
 * 线程阻塞，方便动画等操作
 * @param timeout 阻塞时间
 */
function sleep (timeout = 1000) {
  return new Promise(resolve => setTimeout(resolve, timeout))
}

/**
 * 读取文件
 * @param path 文件路径
 * @param options
 * @returns {{type: "Buffer", data: number[]}|string|null}
 */
function readFile (path, options = {}) {
  if (fs.existsSync(path)) {
    const buffer = fs.readFileSync(path)
    if (buffer) {
      if (options.toJson) {
        return buffer.toJSON()
      } else {
        return buffer.toString()
      }
    }
  }
  return null
}

/**
 * 写入文件
 * @param path 文件路径
 * @param data
 * @param rewrite 是否重写
 * @returns {boolean} 写入结果
 */
function writeFile (path, data, { rewrite = true } = {}) {
  if (fs.existsSync(path)) {
    if (rewrite) {
      fs.writeFileSync(path, data)
      return true
    }
    return false
  } else {
    fs.writeFileSync(path, data)
    return true
  }
}

module.exports = { isObject, exec, execAsync, spinnerStart, sleep, readFile, writeFile }
