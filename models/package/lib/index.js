'use strict'
const path = require('path')
const pkgDir = require('pkg-dir').sync
const pathExists = require('path-exists').sync
const fse = require('fs-extra')
const npminstall = require('npminstall')
// 内置库
const { isObject } = require('@soa-cli/utils')
const formatPath = require('@soa-cli/format-path')
const { getDefaultRegistry, getNpmLatestVersion } = require('@soa-cli/get-npm-info')

class Package {
  constructor (options) {
    if (!options) {
      throw new Error('Package类的options参数不能为空！')
    }
    if (!isObject(options)) {
      throw new Error('Package类的options参数必须为对象！')
    }
    // package的目标路径
    this.targetPath = options.targetPath
    // 缓存package的路径
    this.storeDir = options.storeDir
    // package的name
    this.packageName = options.packageName
    // npminstall 生成的pkg名称会忽略斜杠后的内容
    const existsDLine = options.packageName.indexOf('/')
    this.sortPackageName = existsDLine !== -1 ? options.packageName.slice(0, existsDLine) : options.packageName
    // package的version
    this.packageVersion = options.packageVersion
    // package的缓存目录前缀
    this.cacheFilePathPrefix = this.packageName.replace('/', '_')
  }

  get cacheFilePath () {
    // @soa-cli/init 1.0.0 => _@soa-cli_init@1.0.0@@soa-cli/init
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.sortPackageName}`)
  }

  getSpecificCacheFilePath (packageVersion) {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${packageVersion}@${this.sortPackageName}`)
  }

  // 安装和更新的前置操作
  async prepare () {
    // 校验缓存目录
    if (this.storeDir && !pathExists(this.storeDir)) {
      // 目录不存在，创建缓存目录
      fse.mkdirpSync(this.storeDir)
    }
    // 将latest转化为最新的版本号
    if (this.packageVersion === 'latest') {
      this.packageVersion = await getNpmLatestVersion(this.packageName)
    }
  }

  // 判断当前Package是否存在
  async exists () {
    if (this.storeDir) {
      await this.prepare()
      // 校验缓存pkg是否存在
      return pathExists(this.cacheFilePath)
    } else {
      return pathExists(this.targetPath)
    }
  }

  // 安装Package
  async install () {
    await this.prepare()
    return npminstall({
      root: this.targetPath, // 命令执行路径
      storeDir: this.storeDir, // 缓存node_modules目录
      registry: getDefaultRegistry(), // 源地址
      pkgs: [{ // 需要安装的pkg
        name: this.packageName,
        version: this.packageVersion,
      }],
    })
  }

  // 更新Package
  async update () {
    await this.prepare()
    // 1. 获取最新的npm模块版本号
    const latestPackageVersion = await getNpmLatestVersion(this.packageName)
    // 2. 查询最新版本号对应的路径是否存在
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion)
    // 3. 如果不存在，则直接安装最新版本
    if (!pathExists(latestFilePath)) {
      await npminstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(),
        pkgs: [{
          name: this.packageName,
          version: latestPackageVersion
        }]
      })
    }
    // 4. 更新版本号
    this.packageVersion = latestPackageVersion
  }

  // 获取入口文件的路径
  getRootFilePath () {
    function _getRootFile (targetPath) {
      // 1. 获取package.json所在目录
      const dir = pkgDir(targetPath)
      if (dir) {
        // 2. 读取package.json
        const pkgFile = require(path.resolve(dir, 'package.json'))
        // 3. 判断main字段是否存在（commonjs规范）
        if (pkgFile && pkgFile.main) {
          // 4. 返回入口文件路径，需要做路径兼容(macOS/windows)
          return formatPath(path.resolve(dir, pkgFile.main))
        }
      }
      return null
    }

    // 是否存在缓存目录
    if (this.storeDir) {
      // 去缓存目录中查找
      return _getRootFile(this.cacheFilePath)
    } else {
      // 在本地调试路径中查找
      return _getRootFile(this.targetPath)
    }
  }
}

module.exports = Package

