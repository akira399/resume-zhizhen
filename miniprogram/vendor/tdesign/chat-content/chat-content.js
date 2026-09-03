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
const { prefix } = import_config.default, name = `${prefix}-chat-content`;
let ChatContent = class extends import_src.SuperComponent {
  constructor() {
    super(...arguments), this.options = { multipleSlots: true }, this.properties = import_props.default, this.data = { classPrefix: name, textInfo: "" }, this.observers = { content() {
      this.setTextInfo();
    } }, this.methods = { getEscapeReplacement: (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t], escape(t, e = false) {
      const s = /[&<>"']/, o = new RegExp(s.source, "g"), n = /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, a = new RegExp(n.source, "g");
      if (e) {
        if (s.test(t)) return t.replace(o, this.data.getEscapeReplacement);
      } else if (n.test(t)) return t.replace(a, this.data.getEscapeReplacement);
      return t;
    }, onMarkdownClick(t) {
      this.triggerEvent("click", t.detail);
    }, setTextInfo() {
      "text" === this.properties.content.type || "error" === this.properties.status ? this.setData({ textInfo: this.escape(this.properties.content.data || "") }) : this.setData({ textInfo: this.properties.content.data });
    } }, this.lifetimes = { created() {
      this.data.getEscapeReplacement = this.getEscapeReplacement.bind(this), this.data.escape = this.escape.bind(this);
    }, attached() {
      this.setTextInfo();
    }, detached() {
    } };
  }
};
ChatContent = (0, import_tslib.__decorate)([(0, import_src.wxComponent)()], ChatContent);
var stdin_default = ChatContent;
