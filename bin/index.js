#!/usr/bin/env node

const argv = require("process").argv;
// 获取输入命令
const command = argv[2];
const options = argv.slice(3);

// 参数处理
if (options.length > 1) {
  let [option, param] = options;
  option = option.replace("--", "");

  if (command === "init") {
    console.log("init", option, param);
  } else {
    console.log("请输入命令");
  }
}

// version处理
if (command.startsWith("--") || command.startsWith("-")) {
  const globalOption = command.replace(/--|-/g, "");
  if (globalOption === "version" || globalOption === "V") {
    console.log("0.0.3");
  }
}
