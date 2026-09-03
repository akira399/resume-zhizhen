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
var import_utils = require("../common/utils");
var import_validator = require("../common/validator");
const { prefix } = import_config.default, name = `${prefix}-tag`;
let Tag = class extends import_src.SuperComponent {
  constructor() {
    super(...arguments), this.data = { prefix, classPrefix: name, className: "", tagStyle: "" }, this.properties = import_props.default, this.externalClasses = [`${prefix}-class`], this.options = { multipleSlots: true }, this.lifetimes = { attached() {
      this.setClass(), this.setTagStyle();
    } }, this.observers = { "size, shape, theme, variant, closable, disabled"() {
      this.setClass();
    }, maxWidth() {
      this.setTagStyle();
    }, icon(s) {
      this.setData({ _icon: (0, import_utils.calcIcon)(s) });
    }, closable(s) {
      this.setData({ _closable: (0, import_utils.calcIcon)(s, "close") });
    } }, this.methods = { setClass() {
      const { prefix: s, classPrefix: t } = this.data, { size: e, shape: a, theme: i, variant: o, closable: l, disabled: r } = this.properties, c = (0, import_utils.classNames)([t, `${t}--${i || "default"}`, `${t}--${o}`, l ? `${t}--closable ${s}-is-closable` : "", r ? `${t}--disabled ${s}-is-disabled` : "", `${t}--${e}`, `${t}--${a}`]);
      this.setData({ className: c });
    }, setTagStyle() {
      const { maxWidth: s } = this.properties;
      if (!s) return "";
      const t = (0, import_validator.isNumeric)(s) ? `${s}px` : s;
      this.setData({ tagStyle: `max-width:${t};` });
    }, handleClick(s) {
      this.data.disabled || this.triggerEvent("click", s);
    }, handleClose(s) {
      this.data.disabled || this.triggerEvent("close", s);
    } };
  }
};
Tag = (0, import_tslib.__decorate)([(0, import_src.wxComponent)()], Tag);
var stdin_default = Tag;
