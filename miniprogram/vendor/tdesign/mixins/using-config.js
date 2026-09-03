var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var stdin_exports = {};
__export(stdin_exports, {
  default: () => usingConfig
});
module.exports = __toCommonJS(stdin_exports);
var import_use_config = require("../config-provider/use-config");
var import_utils = require("../common/utils");
var import_zh_CN = __toESM(require("../locale/zh_CN"));
function usingConfig(o) {
  const { componentName: e, localeTextPropName: t } = o, a = (0, import_utils.toCamel)(e);
  return Behavior({ data: { globalConfig: {} }, lifetimes: { attached() {
    var o2;
    null === (o2 = this.updateLocale) || void 0 === o2 || o2.call(this);
    const e2 = (0, import_use_config.useConfig)(a);
    this._unsubscribeLocale = e2.subscribeLocale(this, () => {
      var o3;
      null === (o3 = this.updateLocale) || void 0 === o3 || o3.call(this);
    });
  }, detached() {
    const o2 = this._unsubscribeLocale;
    o2 && (o2(), this._unsubscribeLocale = null);
  } }, methods: { updateLocale() {
    const o2 = import_zh_CN.default[a] || {}, e2 = (0, import_use_config.getComponentLocale)(this, a, o2, t);
    this.setData({ globalConfig: e2 });
  } } });
}
