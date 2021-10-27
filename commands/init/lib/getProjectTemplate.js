const request = require('@soa-cli/request')

module.exports = function () {
  return request({
    url: '/project/template',
  })
}
