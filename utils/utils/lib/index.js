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

module.exports = { isObject, exec }
