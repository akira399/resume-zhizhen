var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var stdin_exports = {};
__export(stdin_exports, {
  canIUseFormFieldButton: () => canIUseFormFieldButton,
  canUseProxyScrollView: () => canUseProxyScrollView,
  canUseVirtualHost: () => canUseVirtualHost,
  compareVersion: () => compareVersion
});
module.exports = __toCommonJS(stdin_exports);
var import_wechat = require("./wechat");
let systemInfo;
function getSystemInfo() {
  return null == systemInfo && (systemInfo = (0, import_wechat.getAppBaseInfo)()), systemInfo;
}
function compareVersion(e, n) {
  e = e.split("."), n = n.split(".");
  const t = Math.max(e.length, n.length);
  for (; e.length < t; ) e.push("0");
  for (; n.length < t; ) n.push("0");
  for (let r = 0; r < t; r += 1) {
    const t2 = parseInt(e[r], 10), o = parseInt(n[r], 10);
    if (t2 > o) return 1;
    if (t2 < o) return -1;
  }
  return 0;
}
function judgeByVersion(e) {
  return compareVersion(getSystemInfo().SDKVersion, e) >= 0;
}
function canIUseFormFieldButton() {
  return judgeByVersion("2.10.3");
}
function canUseVirtualHost() {
  return judgeByVersion("2.19.2");
}
function canUseProxyScrollView() {
  return judgeByVersion("2.19.2");
}
