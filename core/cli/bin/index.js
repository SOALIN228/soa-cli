#! /usr/bin/env node

const importLocal = require('import-local');

if (importLocal(__filename)) {
  require('npmlog').info('cli', '正在使用 soa-cli 本地版本');
} else {
  // 通过process.argv 读取命令行参数，前两个为命令执行地址，后续为命令携带参数
  require('../lib')(process.argv.slice(2));
}
