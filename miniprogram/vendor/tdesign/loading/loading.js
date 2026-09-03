var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
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
  default: () => stdin_default
});
module.exports = __toCommonJS(stdin_exports);
var import_tslib = require("../tslib/tslib.js");
var import_src = require("../common/src/index");
var import_config = __toESM(require("../common/config"));
var import_props = __toESM(require("./props"));
const { prefix } = import_config.default, name = `${prefix}-loading`;
let Loading = class extends import_src.SuperComponent {
  constructor() {
    super(...arguments), this.externalClasses = [`${prefix}-class`, `${prefix}-class-text`, `${prefix}-class-indicator`], this.data = { prefix, classPrefix: name, show: true }, this.options = { multipleSlots: true }, this.properties = Object.assign({}, import_props.default), this.timer = null, this.observers = { loading(e) {
      const { delay: t } = this.properties;
      this.timer && clearTimeout(this.timer), e && t ? this.timer = setTimeout(() => {
        this.setData({ show: e }), this.timer = null;
      }, t) : this.setData({ show: e });
    } }, this.lifetimes = { detached() {
      clearTimeout(this.timer);
    } };
  }
  refreshPage() {
    this.triggerEvent("reload");
  }
};
Loading = (0, import_tslib.__decorate)([(0, import_src.wxComponent)()], Loading);
var stdin_default = Loading;
