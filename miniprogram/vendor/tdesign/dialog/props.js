var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var stdin_exports = {};
__export(stdin_exports, {
  default: () => stdin_default
});
module.exports = __toCommonJS(stdin_exports);
const props = { actions: { type: Array }, buttonLayout: { type: String, value: "horizontal" }, cancelBtn: { type: null }, closeBtn: { type: null, value: false }, closeOnOverlayClick: { type: Boolean, value: false }, confirmBtn: { type: null }, content: { type: String }, overlayProps: { type: Object, value: {} }, preventScrollThrough: { type: Boolean, value: true }, showOverlay: { type: Boolean, value: true }, title: { type: String }, usingCustomNavbar: { type: Boolean, value: false }, visible: { type: Boolean }, zIndex: { type: Number, value: 11500 } };
var stdin_default = props;
