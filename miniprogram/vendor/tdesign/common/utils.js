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
  addUnit: () => addUnit,
  appBaseInfo: () => appBaseInfo,
  calcIcon: () => calcIcon,
  chunk: () => chunk,
  classNames: () => classNames,
  debounce: () => debounce,
  deviceInfo: () => deviceInfo,
  getAnimationFrame: () => getAnimationFrame,
  getCharacterLength: () => getCharacterLength,
  getCurrentPage: () => getCurrentPage,
  getInstance: () => getInstance,
  getRect: () => getRect,
  getTreeDepth: () => getTreeDepth,
  isIOS: () => isIOS,
  isOverSize: () => isOverSize,
  isPC: () => isPC,
  isWxWork: () => isWxWork,
  nextTick: () => nextTick,
  rpx2px: () => rpx2px,
  setIcon: () => setIcon,
  styles: () => styles,
  systemInfo: () => systemInfo,
  throttle: () => throttle,
  toCamel: () => toCamel,
  toKebabCase: () => toKebabCase,
  uniqueFactory: () => uniqueFactory,
  unitConvert: () => unitConvert
});
module.exports = __toCommonJS(stdin_exports);
var import_config = require("./config");
var import_validator = require("./validator");
var import_wechat = require("./wechat");
const systemInfo = (0, import_wechat.getWindowInfo)();
const appBaseInfo = (0, import_wechat.getAppBaseInfo)();
const deviceInfo = (0, import_wechat.getDeviceInfo)();
const debounce = function(e, t = 500) {
  let n;
  return function(...o) {
    n && clearTimeout(n), n = setTimeout(() => {
      e.apply(this, o);
    }, t);
  };
};
const throttle = (e, t = 100, n = null) => {
  let o = 0, r = null;
  return n || (n = { leading: true }), function(...c) {
    const s = Date.now();
    o || n.leading || (o = s);
    const i = this;
    t - (s - o) <= 0 && (r && (clearTimeout(r), r = null), o = s, e.apply(i, c));
  };
};
const classNames = function(...e) {
  const t = {}.hasOwnProperty, n = [];
  return e.forEach((e2) => {
    if (!e2) return;
    const o = typeof e2;
    if ("string" === o || "number" === o) n.push(e2);
    else if (Array.isArray(e2) && e2.length) {
      const t2 = classNames(...e2);
      t2 && n.push(t2);
    } else if ("object" === o) for (const o2 in e2) t.call(e2, o2) && e2[o2] && n.push(o2);
  }), n.join(" ");
};
const styles = function(e) {
  return Object.keys(e).map((t) => `${t}: ${e[t]}`).join("; ");
};
const getAnimationFrame = function(e, t) {
  return e.createSelectorQuery().selectViewport().boundingClientRect().exec(() => {
    t();
  });
};
const getRect = function(e, t, n = false) {
  return new Promise((o, r) => {
    e.createSelectorQuery()[n ? "selectAll" : "select"](t).boundingClientRect((e2) => {
      e2 ? o(e2) : r(e2);
    }).exec();
  });
};
const getTreeDepth = (e, t) => e.reduce((e2, n) => n[null != t ? t : "children"] && n[null != t ? t : "children"].length > 0 ? Math.max(e2, getTreeDepth(n[null != t ? t : "children"], t) + 1) : Math.max(e2, 1), 0);
const isIOS = function() {
  var e;
  return !!((null === (e = null == deviceInfo ? void 0 : deviceInfo.system) || void 0 === e ? void 0 : e.toLowerCase().search("ios")) + 1);
};
const isWxWork = "wxwork" === (null == deviceInfo ? void 0 : deviceInfo.environment);
const isPC = ["mac", "windows"].includes(null == deviceInfo ? void 0 : deviceInfo.platform);
const addUnit = function(e) {
  if ((0, import_validator.isDef)(e)) return e = String(e), (0, import_validator.isNumeric)(e) ? `${e}px` : e;
};
const getCharacterLength = (e, t, n) => {
  const o = String(null != t ? t : "");
  if (0 === o.length) return { length: 0, characters: "" };
  if ("maxcharacter" === e) {
    let e2 = 0;
    for (let t2 = 0; t2 < o.length; t2 += 1) {
      let r = 0;
      if (r = o.charCodeAt(t2) > 127 || 94 === o.charCodeAt(t2) ? 2 : 1, e2 + r > n) return { length: e2, characters: o.slice(0, t2) };
      e2 += r;
    }
    return { length: e2, characters: o };
  }
  if ("maxlength" === e) {
    const e2 = o.length > n ? n : o.length;
    return { length: e2, characters: o.slice(0, e2) };
  }
  return { length: o.length, characters: o };
};
const chunk = (e, t) => Array.from({ length: Math.ceil(e.length / t) }, (n, o) => e.slice(o * t, o * t + t));
const getInstance = function(e, t) {
  if (!e) {
    const t2 = getCurrentPages(), n2 = t2[t2.length - 1];
    e = n2.$$basePage || n2;
  }
  const n = e ? e.selectComponent(t) : null;
  return n || (console.warn("\u672A\u627E\u5230\u7EC4\u4EF6,\u8BF7\u68C0\u67E5selector\u662F\u5426\u6B63\u786E"), null);
};
const unitConvert = (e) => {
  var t;
  return "string" == typeof e ? e.includes("rpx") ? parseInt(e, 10) * (null !== (t = null == systemInfo ? void 0 : systemInfo.screenWidth) && void 0 !== t ? t : 750) / 750 : parseInt(e, 10) : null != e ? e : 0;
};
const setIcon = (e, t, n) => t ? "string" == typeof t ? { [`${e}Name`]: t, [`${e}Data`]: {} } : "object" == typeof t ? { [`${e}Name`]: "", [`${e}Data`]: t } : { [`${e}Name`]: n, [`${e}Data`]: {} } : { [`${e}Name`]: "", [`${e}Data`]: {} };
const toCamel = (e) => e.replace(/-(\w)/g, (e2, t) => t.toUpperCase());
function toKebabCase(e) {
  return e.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/([A-Z])([A-Z][a-z])/g, "$1-$2").replace(/([0-9])([a-zA-Z])/g, "$1-$2").toLowerCase();
}
const getCurrentPage = function() {
  const e = getCurrentPages();
  return e[e.length - 1];
};
const uniqueFactory = (e) => {
  let t = 0;
  return () => {
    const n = `${import_config.prefix}_${e}_${t}`;
    return t += 1, n;
  };
};
const calcIcon = (e, t) => e && ((0, import_validator.isBoolean)(e) && t || (0, import_validator.isString)(e)) ? { name: (0, import_validator.isBoolean)(e) ? t : e } : (0, import_validator.isObject)(e) ? e : null;
const isOverSize = (e, t) => {
  var n;
  if (!t) return false;
  const o = 1e3, r = { B: 1, KB: o, MB: 1e6, GB: 1e9 };
  return e > ("number" == typeof t ? t * o : (null == t ? void 0 : t.size) * r[null !== (n = null == t ? void 0 : t.unit) && void 0 !== n ? n : "KB"]);
};
const rpx2px = (e) => Math.floor(systemInfo.windowWidth * e / 750);
const nextTick = () => new Promise((e) => {
  wx.nextTick(() => {
    e();
  });
});
