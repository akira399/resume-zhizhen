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
const MinDistance = 10, getDirection = (t, s) => t > s && t > 10 ? "horizontal" : s > t && s > 10 ? "vertical" : "";
var stdin_default = Behavior({ methods: { resetTouchStatus() {
  this.direction = "", this.deltaX = 0, this.deltaY = 0, this.offsetX = 0, this.offsetY = 0;
}, touchStart(t) {
  this.resetTouchStatus();
  const [s] = t.touches;
  this.startX = s.clientX, this.startY = s.clientY;
}, touchMove(t) {
  const [s] = t.touches;
  this.deltaX = s.clientX - this.startX, this.deltaY = s.clientY - this.startY, this.offsetX = Math.abs(this.deltaX), this.offsetY = Math.abs(this.deltaY), this.direction = getDirection(this.offsetX, this.offsetY);
} } });
