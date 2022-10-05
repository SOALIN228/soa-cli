'use strict'

const path = require('path')

function formatPath (p) {
  if (p && typeof p === 'string') {
    // 获取当前操作系统的斜杠
    const sep = path.sep
    // mac、linux操作系统
    if (sep === '/') {
      return p
    } else {
      // window 操作系统
      return p.replace(/\\/g, '/')
    }
  }
  return p
}

module.exports = formatPath
