'use strict'

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

module.exports = { isObject, exec, spinnerStart, sleep }
