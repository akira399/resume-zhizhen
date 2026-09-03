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
var import_utils = require("../common/utils");
const useCustomNavbarBehavior = Behavior({ properties: { usingCustomNavbar: { type: Boolean, value: false }, customNavbarHeight: { type: Number, value: 0 } }, data: { distanceTop: 0 }, lifetimes: { attached() {
  this.properties.usingCustomNavbar && this.calculateCustomNavbarDistanceTop();
} }, methods: { calculateCustomNavbarDistanceTop() {
  const { statusBarHeight: t } = import_utils.systemInfo, a = wx.getMenuButtonBoundingClientRect(), e = a.top + a.bottom - t;
  this.setData({ distanceTop: Math.max(e, this.properties.customNavbarHeight + t) });
} } });
var stdin_default = useCustomNavbarBehavior;
