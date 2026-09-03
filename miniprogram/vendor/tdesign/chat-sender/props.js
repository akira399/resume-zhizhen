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
const props = { adjustPosition: { type: Boolean, value: false }, allowSpeech: { type: Boolean, value: false }, attachmentsProps: { type: Object }, autoRiseWithKeyboard: { type: Boolean, value: false }, disabled: { type: Boolean, value: false }, fileList: { type: Array, value: [] }, loading: { type: Boolean, value: false }, placeholder: { type: String, value: "" }, renderPresets: { type: Array, value: [{ name: "upload", presets: ["uploadCamera", "uploadImage", "uploadAttachment"], status: "" }, { name: "send", type: "icon" }] }, textareaProps: { type: null, value: { autosize: { maxHeight: 264, minHeight: 48 } } }, value: { type: String, value: "" }, visible: { type: Boolean, value: false } };
var stdin_default = props;
