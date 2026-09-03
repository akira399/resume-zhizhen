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
const props = { activityType: { type: Number }, appParameter: { type: String, value: "" }, block: { type: Boolean, value: false }, content: { type: String }, customDataset: { type: null }, disabled: { type: null, value: void 0 }, entrancePath: { type: String, value: "" }, ghost: { type: Boolean, value: false }, hoverClass: { type: String, value: "" }, hoverStartTime: { type: Number, value: 20 }, hoverStayTime: { type: Number, value: 70 }, hoverStopPropagation: { type: Boolean, value: false }, icon: { type: null }, lang: { type: String }, loading: { type: Boolean, value: false }, loadingProps: { type: Object }, needShowEntrance: { type: Boolean, value: true }, openType: { type: String }, phoneNumberNoQuotaToast: { type: Boolean, value: true }, sendMessageImg: { type: String, value: "\u622A\u56FE" }, sendMessagePath: { type: String, value: "\u5F53\u524D\u5206\u4EAB\u8DEF\u5F84" }, sendMessageTitle: { type: String, value: "\u5F53\u524D\u6807\u9898" }, sessionFrom: { type: String, value: "" }, shape: { type: String, value: "rectangle" }, showMessageCard: { type: Boolean, value: false }, size: { type: String, value: "medium" }, tId: { type: String, value: "" }, theme: { type: String, value: "default" }, type: { type: String }, variant: { type: String, value: "base" } };
var stdin_default = props;
