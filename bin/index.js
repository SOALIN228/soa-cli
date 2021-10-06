#!/usr/bin/env node
const dedent = require("dedent");
const log = require("npmlog");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const pkg = require("../package.json");

// 获取输入参数
const arg = hideBin(process.argv);
const cli = yargs(arg);
// 命令行中用户输入的参数
const argv = process.argv.slice(2);

const context = {
  soaVersion: pkg.version,
};

// 定义命令
const opts = {
  debug: {
    type: "boolean",
    describe: "Bootstrap debug mode.",
    alias: "d",
    hidden: true,
  },
};

// 获取全局命令
const globalKeys = Object.keys(opts).concat(["help", "version"]);

/**
 * usage: 提示头信息
 * demandCommand：最少输入1个参数
 * recommendCommands: 参数智能提示
 * strict：开启严格模式，不存在的命令，会进行提示
 * fail： 处理错误
 * alias: 开启别名
 * wrap：设置宽度，yargs内置方法terminalWidth获取命令行宽度，实现填满效果
 * epilogue： 在页脚展示信息，dedent可以保证我们每行文字都是从顶格开始
 * options: 定义命令行参数信息
 * group: 分组展示命令
 * option: 可以定义一些内部参数作为参数注入到argv中，方便开发时使用
 * command：自定义命令
 * parse: 可以向argv中注入参数
 */
cli
  .usage("Usage: soa-cli [command] <options>")
  .demandCommand(
    1,
    "A command is required. Pass --help to see all available commands and options."
  )
  .recommendCommands()
  .strict()
  .fail((msg, err) => {
    // 错误msg
    const actual = err || new Error(msg);
    // 使用log库，更加美观的提示错误
    log.error("soa-cli", actual.message);
  })
  .alias("h", "help")
  .alias("v", "version")
  .wrap(cli.terminalWidth())
  .epilogue(
    dedent`
  Thanks for using soa-cli.

  For more information, find our manual at https://github.com/SOALIN228/soa-cli
`
  )
  .options(opts)
  .group(globalKeys, "Global Options:")
  .option("registry", {
    type: "string",
    describe: "Define global registry",
    hidden: true,
  })
  .command({
    command: "list",
    aliases: ["ls", "ll", "la"],
    describe: "List local packages",
    builder: (yargs) => {},
    handler: (argv) => {
      console.log(argv);
    },
  })
  .parse(argv, context);
