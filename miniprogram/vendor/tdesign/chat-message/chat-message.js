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
var import_props = __toESM(require("./props"));
var import_config = __toESM(require("../common/config"));
const { prefix } = import_config.default, name = `${prefix}-chat-message`;
let ChatMessage = class extends import_src.SuperComponent {
  constructor() {
    super(...arguments), this.options = { multipleSlots: true }, this.properties = import_props.default, this.data = { classPrefix: name, article: "", showAvatar: null, showName: null, showDateTime: null, contentClasses: [], chatItemClass: [] }, this.observers = { avatar() {
      this.setShowAvatar();
    }, name() {
      this.setShowName();
    }, datetime() {
      this.setShowDateTime();
    }, classPrefix() {
      this.setContentClasses();
    }, "classPrefix, variant, placement, showDateTime"() {
      this.setChatItemClass();
    } }, this.methods = { handleLongPress(t) {
      this.triggerEvent("message-longpress", { e: t, id: this.data.chatId, longPressPosition: { x: t.detail.x, y: t.detail.y } });
    }, onContentClick(t) {
      this.triggerEvent("click", t.detail);
    }, setShowAvatar() {
      var t;
      this.setData({ showAvatar: (null === (t = this.properties) || void 0 === t ? void 0 : t.avatar) || "" });
    }, setShowName() {
      var t;
      this.setData({ showName: (null === (t = this.properties) || void 0 === t ? void 0 : t.name) || "" });
    }, setShowDateTime() {
      var t;
      this.setData({ showDateTime: (null === (t = this.properties) || void 0 === t ? void 0 : t.datetime) || "" });
    }, setContentClasses() {
      this.setData({ contentClasses: [`${this.data.classPrefix}__content`] });
    }, setChatItemClass() {
      const { classPrefix: t, showDateTime: e } = this.data, { variant: s, role: a, placement: i } = this.properties, o = [`${t}`, `${t}--${s}`, a, i];
      e && o.push(`${t}__header`), this.setData({ chatItemClass: o });
    } }, this.lifetimes = { created() {
      this.data.handleLongPress = this.handleLongPress.bind(this);
    }, attached() {
      this.setShowAvatar(), this.setShowName(), this.setShowDateTime(), this.setContentClasses(), this.setChatItemClass();
    }, detached() {
    } };
  }
};
ChatMessage = (0, import_tslib.__decorate)([(0, import_src.wxComponent)()], ChatMessage);
var stdin_default = ChatMessage;
