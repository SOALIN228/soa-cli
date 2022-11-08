const GitServer = require('./GitServer')
const GithubRequest = require('./GithubRequest')

class Github extends GitServer {
  constructor () {
    super('github')
    this.request = null
  }

  getUser () {
    return this.request.get('/user')
  }

  getOrg (username) {
    return this.request.get(`/user/orgs`, {
      page: 1,
      per_page: 100,
    })
  }

  setToken (token) {
    super.setToken(token)
    this.request = new GithubRequest(token)
  }

  // token 配置地址
  getTokenUrl () {
    return 'https://github.com/settings/tokens'
  }

  // token 帮助文档
  getTokenHelpUrl () {
    return 'https://docs.github.com/en/github/authenticating-to-github/connecting-to-github-with-ssh'
  }
}

module.exports = Github
