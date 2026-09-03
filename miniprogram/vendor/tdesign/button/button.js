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
var import_version = require("../common/version");
var import_utils = require("../common/utils");
const { prefix } = import_config.default, name = `${prefix}-button`;
let Button = class extends import_src.SuperComponent {
  constructor() {
    super(...arguments), this.externalClasses = [`${prefix}-class`, `${prefix}-class-icon`, `${prefix}-class-loading`], this.behaviors = (0, import_version.canIUseFormFieldButton)() ? ["wx://form-field-button"] : [], this.properties = import_props.default, this.options = { multipleSlots: true }, this.data = { prefix, className: "", classPrefix: name }, this.observers = { "theme, size, plain, block, shape, disabled, loading, variant"() {
      this.setClass();
    }, icon(t) {
      this.setData({ _icon: (0, import_utils.calcIcon)(t, "") });
    } }, this.lifetimes = { attached() {
      this.setClass();
    } }, this.methods = { setClass() {
      const t = [name, `${prefix}-class`, `${name}--${this.data.variant || "base"}`, `${name}--${this.data.theme || "default"}`, `${name}--${this.data.shape || "rectangle"}`, `${name}--size-${this.data.size || "medium"}`];
      this.data.block && t.push(`${name}--block`), this.data.disabled && t.push(`${name}--disabled`), this.data.ghost && t.push(`${name}--ghost`), this.setData({ className: t.join(" ") });
    }, getuserinfo(t) {
      this.triggerEvent("getuserinfo", t.detail);
    }, contact(t) {
      this.triggerEvent("contact", t.detail);
    }, createliveactivity(t) {
      this.triggerEvent("createliveactivity", t.detail);
    }, getphonenumber(t) {
      this.triggerEvent("getphonenumber", t.detail);
    }, getrealtimephonenumber(t) {
      this.triggerEvent("getrealtimephonenumber", t.detail);
    }, error(t) {
      this.triggerEvent("error", t.detail);
    }, opensetting(t) {
      this.triggerEvent("opensetting", t.detail);
    }, launchapp(t) {
      this.triggerEvent("launchapp", t.detail);
    }, chooseavatar(t) {
      this.triggerEvent("chooseavatar", t.detail);
    }, agreeprivacyauthorization(t) {
      this.triggerEvent("agreeprivacyauthorization", t.detail);
    }, phoneoneclicklogin(t) {
      this.triggerEvent("phoneoneclicklogin", t.detail);
    }, handleTap(t) {
      this.data.disabled || this.data.loading || this.triggerEvent("tap", t);
    } };
  }
};
Button = (0, import_tslib.__decorate)([(0, import_src.wxComponent)()], Button);
var stdin_default = Button;
