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
var import_using_custom_navbar = __toESM(require("../mixins/using-custom-navbar"));
const { prefix } = import_config.default, name = `${prefix}-dialog`;
let Dialog = class extends import_src.SuperComponent {
  constructor() {
    super(...arguments), this.behaviors = [import_using_custom_navbar.default], this.options = { multipleSlots: true }, this.externalClasses = [`${prefix}-class`, `${prefix}-class-content`, `${prefix}-class-confirm`, `${prefix}-class-cancel`, `${prefix}-class-action`], this.properties = import_props.default, this.data = { prefix, classPrefix: name, buttonVariant: "text" }, this.observers = { "confirmBtn, cancelBtn"(t, e) {
      const { prefix: o, classPrefix: i, buttonLayout: n } = this.data, s = { buttonVariant: "text" }, r = [t, e].some((t2) => (0, import_validator.isObject)(t2) && t2.variant && "text" !== t2.variant), a = { confirm: t, cancel: e }, c = [`${i}__button`], l = [];
      r ? (s.buttonVariant = "base", c.push(`${i}__button--${n}`)) : (c.push(`${i}__button--text`), l.push(`${i}-button`)), Object.keys(a).forEach((t2) => {
        const e2 = a[t2], n2 = { block: true, rootClass: [...c, `${i}__button--${t2}`], tClass: [...l, `${o}-class-${t2}`], variant: s.buttonVariant, openType: "" };
        "cancel" === t2 && "base" === s.buttonVariant && (n2.theme = "light"), s[`_${t2}`] = "string" == typeof e2 ? Object.assign(Object.assign({}, n2), { content: e2 }) : e2 && "object" == typeof e2 ? Object.assign(Object.assign({}, n2), e2) : null;
      }), this.setData(Object.assign({}, s));
    } }, this.methods = { onTplButtonTap(t) {
      var e, o, i;
      const n = t.type, { type: s, extra: r } = t.target.dataset, a = this.data[`_${s}`], c = `bind${n}`;
      if ("action" === s) return void this.onActionTap(r);
      if ("function" == typeof a[c]) {
        a[c](t) && this.close();
      }
      if (!!!a.openType && ["confirm", "cancel"].includes(s) && (null === (e = this[(0, import_utils.toCamel)(`on-${s}`)]) || void 0 === e || e.call(this, s)), "tap" !== n) {
        const e2 = (null === (i = null === (o = t.detail) || void 0 === o ? void 0 : o.errMsg) || void 0 === i ? void 0 : i.indexOf("ok")) > -1;
        this.triggerEvent(e2 ? "open-type-event" : "open-type-error-event", t.detail);
      }
    }, onConfirm() {
      this.triggerEvent("confirm"), this._onConfirm && (this._onConfirm({ trigger: "confirm" }), this.close());
    }, onCancel() {
      const t = { trigger: "cancel" };
      this.triggerEvent("cancel"), this.triggerEvent("close", t), this._onCancel && (this._onCancel(t), this.close());
    }, onClose() {
      var t;
      const e = { trigger: "close-btn" };
      this.triggerEvent("close", e), null === (t = this._onCancel) || void 0 === t || t.call(this, e), this.close();
    }, close() {
      this.setData({ visible: false });
    }, overlayClick() {
      var t;
      if (this.triggerEvent("overlay-click"), this.properties.closeOnOverlayClick) {
        const e = { trigger: "overlay" };
        this.triggerEvent("close", e), null === (t = this._onCancel) || void 0 === t || t.call(this, e), this.close();
      }
    }, onActionTap(t) {
      this.triggerEvent("action", { index: t }), this._onAction && (this._onAction({ index: t }), this.close());
    }, openValueCBHandle(t) {
      this.triggerEvent("open-type-event", t.detail);
    }, openValueErrCBHandle(t) {
      this.triggerEvent("open-type-error-event", t.detail);
    } };
  }
};
Dialog = (0, import_tslib.__decorate)([(0, import_src.wxComponent)()], Dialog);
var stdin_default = Dialog;
