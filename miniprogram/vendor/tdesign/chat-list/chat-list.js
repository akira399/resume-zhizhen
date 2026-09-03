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
const { prefix } = import_config.default, name = `${prefix}-chat-list`;
let Chat = class extends import_src.SuperComponent {
  constructor() {
    super(...arguments), this.options = { multipleSlots: true }, this.properties = Object.assign(Object.assign({}, import_props.default), { virtualList: { type: Boolean, value: false }, fragmentLen: { type: Number, value: 8 } }), this.data = { classPrefix: name, scrollViewTop: 0, classes: [], listClasses: [], startIndex: 0, endIndex: 0 }, this.observers = { data() {
      const t = this.properties.data.length;
      this.properties.virtualList && this.oldDataLen !== t && (this.oldDataLen = t, this.resetFragments());
    } }, this.methods = { setScrollTop(t = 0) {
      t === this.data.scrollViewTop && (t -= 1), this.setData({ scrollViewTop: t });
    }, scrollToBottom() {
      const t = this.properties.reverse ? 0 : 999999;
      this.setScrollTop(t);
    }, onScroll(t) {
      this.triggerEvent("scroll", t);
    }, handlerScrollToUpper() {
      !this.properties.reverse && this.properties.virtualList && this.addFragment();
    }, handlerScrollToLower() {
      this.properties.reverse && this.properties.virtualList && this.addFragment();
    }, resetFragments() {
      const t = this.properties.data.length;
      if (t) {
        const { fragmentLen: e } = this.properties;
        this.properties.reverse ? this.setData({ startIndex: 0, endIndex: Math.min(t - 1, e - 1) }) : this.setData({ startIndex: Math.max(t - e, 0), endIndex: Math.max(t - 1, 0) });
      }
    }, addFragment(t = 4) {
      const e = this.properties.data.length;
      e && (this.properties.reverse ? this.setData({ endIndex: Math.min(e - 1, this.data.endIndex + t) }) : this.setData({ startIndex: Math.max(this.data.startIndex - t, 0) }));
    } }, this.lifetimes = { created() {
      this.data.setScrollTop = this.setScrollTop.bind(this), this.data.scrollToBottom = this.scrollToBottom.bind(this);
    } };
  }
};
Chat = (0, import_tslib.__decorate)([(0, import_src.wxComponent)()], Chat);
var stdin_default = Chat;
