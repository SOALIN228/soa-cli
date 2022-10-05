'use strict'

const axios = require('axios')
const urlJoin = require('url-join')
const semver = require('semver')

/**
 * 根据包名获取package的信息
 * @param npmName 包名
 * @param registry npm包源地址
 * @returns {null|Promise<T>}
 */
function getNpmInfo (npmName, registry) {
  if (!npmName) {
    return null
  }
  const registryUrl = registry || getDefaultRegistry()
  const npmInfoUrl = urlJoin(registryUrl, npmName)
  return axios.get(npmInfoUrl).then(response => {
    if (response.status === 200) {
      return response.data
    }
    return null
  }).catch(err => {
    return Promise.reject(err)
  })
}

/**
 * npm地址
 * @param isOriginal 默认使用官方源，可以选择淘宝源
 */
function getDefaultRegistry (isOriginal = true) {
  return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npmmirror.com'
}

// 获取当前package的版本列表
async function getNpmVersions (npmName, registry) {
  const data = await getNpmInfo(npmName, registry)
  if (data) {
    return Object.keys(data.versions)
  } else {
    return []
  }
}

// 获取满足条件的版本列表
function getSemverVersions (baseVersion, versions) {
  return versions
    .filter(version => semver.satisfies(version, `>${baseVersion}`))
    .sort((a, b) => semver.gt(b, a) ? 1 : -1)
}

// 检查当前版本是否为最新，是返回null，否返回最新版本
async function getNpmSemverVersion (baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry)
  // 获取大于指定version的列表
  const newVersions = getSemverVersions(baseVersion, versions)
  if (newVersions && newVersions.length > 0) {
    return newVersions[0]
  }
  return null
}

// 获取最新npm版本
async function getNpmLatestVersion (npmName, registry) {
  let versions = await getNpmVersions(npmName, registry)
  if (versions) {
    return versions.sort((a, b) => semver.gt(b, a) ? 1 : -1)[0]
  }
  return null
}

module.exports = {
  getNpmInfo,
  getDefaultRegistry,
  getNpmVersions,
  getSemverVersions,
  getNpmSemverVersion,
  getNpmLatestVersion
}
