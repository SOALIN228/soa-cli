'use strict'

const log = require('@soa-cli/log')

const Command = require('@soa-cli/command')

class InitCommand extends Command {
  init () {
    this.projectName = this._argv[0] || ''
    this.force = !!this._cmd.force
    log.verbose('projectName', this.projectName)
    log.verbose('force', this.force)
  }

  async exec () {
  }
}

function init (argv) {
  // log.verbose('argv', argv);
  return new InitCommand(argv)
}

module.exports = init
module.exports.InitCommand = InitCommand
