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
  default: () => stdin_default
});
module.exports = __toCommonJS(stdin_exports);
var import_tslib = require("../tslib/tslib.js");
var import_props = __toESM(require("./props"));
var import_utils = require("../common/utils");
const defaultOptions = { actions: [], buttonLayout: import_props.default.buttonLayout.value, cancelBtn: import_props.default.cancelBtn.value, closeOnOverlayClick: import_props.default.closeOnOverlayClick.value, confirmBtn: import_props.default.confirmBtn.value, content: "", preventScrollThrough: import_props.default.preventScrollThrough.value, showOverlay: import_props.default.showOverlay.value, title: "", visible: import_props.default.visible.value };
var stdin_default = { alert(t) {
  const e = Object.assign({}, t), { context: s, selector: o = "#t-dialog" } = e, n = (0, import_tslib.__rest)(e, ["context", "selector"]), c = (0, import_utils.getInstance)(s, o);
  return c ? new Promise((t2) => {
    const e2 = Object.assign(Object.assign(Object.assign({}, defaultOptions), c.properties), n);
    c.setData(Object.assign(Object.assign({ cancelBtn: "" }, e2), { visible: true })), c._onConfirm = t2;
  }) : Promise.reject();
}, confirm(t) {
  const e = Object.assign({}, t), { context: s, selector: o = "#t-dialog" } = e, n = (0, import_tslib.__rest)(e, ["context", "selector"]), c = (0, import_utils.getInstance)(s, o);
  return c ? new Promise((t2, e2) => {
    const s2 = Object.assign(Object.assign(Object.assign({}, defaultOptions), c.properties), n);
    c.setData(Object.assign(Object.assign({}, s2), { visible: true })), c._onConfirm = t2, c._onCancel = e2;
  }) : Promise.reject();
}, close(t) {
  const { context: e, selector: s = "#t-dialog" } = Object.assign({}, t), o = (0, import_utils.getInstance)(e, s);
  return o ? (o.close(), Promise.resolve()) : Promise.reject();
}, action(t) {
  const e = Object.assign({}, t), { context: s, selector: o = "#t-dialog" } = e, n = (0, import_tslib.__rest)(e, ["context", "selector"]), c = (0, import_utils.getInstance)(s, o);
  if (!c) return Promise.reject();
  const { buttonLayout: r = "vertical", actions: i = c.properties.actions } = t, a = "vertical" === r ? 7 : 3;
  return (!i || "object" == typeof i && (0 === i.length || i.length > a)) && console.warn(`action \u6570\u91CF\u5EFA\u8BAE\u63A7\u5236\u57281\u81F3${a}\u4E2A`), new Promise((t2) => {
    const e2 = Object.assign(Object.assign(Object.assign({}, defaultOptions), c.properties), n);
    c.setData(Object.assign(Object.assign({}, e2), { buttonLayout: r, visible: true })), c._onAction = t2;
  });
} };
