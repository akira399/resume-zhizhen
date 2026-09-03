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
const props = { delay: { type: Number, value: 0 }, duration: { type: Number, value: 800 }, fullscreen: { type: Boolean, value: false }, indicator: { type: Boolean, value: true }, inheritColor: { type: Boolean, value: false }, layout: { type: String, value: "horizontal" }, loading: { type: Boolean, value: true }, pause: { type: Boolean, value: false }, progress: { type: Number }, reverse: { type: Boolean }, size: { type: String, value: "20px" }, text: { type: String }, theme: { type: String, value: "circular" } };
var stdin_default = props;
