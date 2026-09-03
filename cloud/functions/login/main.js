// 构建入口：esbuild 以此文件打包出单文件 index.js（绕开 Windows IDE 打包 node_modules 的路径缺陷）
module.exports = require('./src/index.js')
