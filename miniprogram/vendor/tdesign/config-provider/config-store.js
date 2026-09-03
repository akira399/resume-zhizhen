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
  configStore: () => configStore
});
module.exports = __toCommonJS(stdin_exports);
var import_reactive_state = __toESM(require("./reactive-state"));
class ConfigStore {
  constructor() {
    this.currentLocale = new import_reactive_state.default({}), this.themeVars = new import_reactive_state.default({}), this._pageInitFlags = /* @__PURE__ */ new Map(), this._cleanupCallbacks = /* @__PURE__ */ new Map();
  }
  _deepEqual(e, t) {
    if (e === t) return true;
    if (typeof e != typeof t) return false;
    if (null == e || null == t) return e === t;
    if ("object" != typeof e) return false;
    const a = Object.keys(e), r = Object.keys(t);
    if (a.length !== r.length) return false;
    try {
      const a2 = JSON.stringify(e);
      if (a2 === JSON.stringify(t)) return true;
    } catch (e2) {
    }
    return a.every((a2) => this._deepEqual(e[a2], t[a2]));
  }
  switchLocale(e, t) {
    if (!t) return;
    const a = this._getOrInitPageFlag(t);
    if (a.locale) {
      (!e || 0 === Object.keys(e).length) === (0 === Object.keys(this.currentLocale.value).length) && this._deepEqual(e, this.currentLocale.value) || (this.currentLocale.value = e);
    } else a.locale = true, this.currentLocale.value = e;
  }
  updateThemeVars(e) {
    this.themeVars.value = Object.assign(Object.assign({}, this.themeVars.value), e);
  }
  _getOrInitPageFlag(e) {
    return this._pageInitFlags.has(e) || this._pageInitFlags.set(e, { theme: false, locale: false }), this._pageInitFlags.get(e);
  }
  registerCleanup(e, t) {
    this._cleanupCallbacks.set(e, t);
  }
  resetPageState(e) {
    if (e) {
      this._pageInitFlags.delete(e);
      const t = this._cleanupCallbacks.get(e);
      if (t) {
        try {
          t();
        } catch (t2) {
          console.error(`[ConfigStore] Error during cleanup for ${e}:`, t2);
        }
        this._cleanupCallbacks.delete(e);
      }
      Array.from(this._pageInitFlags.values()).some((e2) => e2.locale) || (this.currentLocale.value = {});
    }
  }
}
const configStore = new ConfigStore();
