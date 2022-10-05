'use strict'

const log = require('npmlog')
// 设置log level，只能调用大于当前优先级的方法
// 如 'info' = 2000，'verbose' = 1000，level为'info'时，无法展示log.verbose的信息
// 开启debug后将优先级设为最低，用来展示内部错误信息
log.level = process.env.LOG_LEVEL || 'info'
// 修改前缀
log.heading = 'soa-cli'
// 添加自定义命令
log.addLevel('success', 2000, { fg: 'green', bold: true })

module.exports = log
