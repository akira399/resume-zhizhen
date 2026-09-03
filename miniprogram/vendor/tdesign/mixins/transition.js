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
  default: () => transition
});
module.exports = __toCommonJS(stdin_exports);
var import_config = __toESM(require("../common/config"));
const { prefix } = import_config.default;
function transition() {
  return Behavior({ properties: { visible: { type: Boolean, value: null, observer: "watchVisible" }, appear: Boolean, name: { type: String, value: "fade" }, durations: { type: Number, optionalTypes: [Array] } }, data: { transitionClass: "", transitionDurations: 300, className: "", realVisible: false }, created() {
    this.status = "", this.transitionT = 0;
  }, attached() {
    this.durations = this.getDurations(), this.data.visible && this.enter(), this.inited = true;
  }, detached() {
    clearTimeout(this.transitionT);
  }, methods: { watchVisible(t, i) {
    this.inited && t !== i && (t ? this.enter() : this.leave());
  }, getDurations() {
    const { durations: t } = this.data;
    return Array.isArray(t) ? t.map((t2) => Number(t2)) : [Number(t), Number(t)];
  }, enter() {
    const { name: t, transitionDurations: i } = this.data, [e] = this.durations;
    this.status = "entering", this.setData({ realVisible: true, transitionClass: `${prefix}-${t}-enter ${prefix}-${t}-enter-active` }), clearTimeout(this.transitionT), setTimeout(() => {
      this.setData({ transitionClass: `${prefix}-${t}-enter-active ${prefix}-${t}-enter-to` });
    }, 30), this.transitionT = "number" == typeof e && e > 0 ? setTimeout(this.entered.bind(this), e + 30) : setTimeout("entering" === this.status ? this.entered.bind(this) : null, i + 30);
  }, entered() {
    this.customDuration = false, clearTimeout(this.transitionT), this.status = "entered", this.setData({ transitionClass: "" });
  }, leave() {
    const { name: t, transitionDurations: i } = this.data, [, e] = this.durations;
    this.status = "leaving", this.setData({ transitionClass: `${prefix}-${t}-leave  ${prefix}-${t}-leave-active` }), clearTimeout(this.transitionT), setTimeout(() => {
      this.setData({ transitionClass: `${prefix}-${t}-leave-active ${prefix}-${t}-leave-to` });
    }, 30), "number" == typeof e && e > 0 ? (this.customDuration = true, this.transitionT = setTimeout(this.leaved.bind(this), e + 30)) : this.transitionT = setTimeout("leaving" === this.status ? this.leaved.bind(this) : null, i + 30);
  }, leaved() {
    this.customDuration = false, this.triggerEvent("leaved"), clearTimeout(this.transitionT), this.status = "leaved", this.setData({ transitionClass: "", realVisible: false });
  }, onTransitionEnd() {
    this.customDuration || (clearTimeout(this.transitionT), "entering" === this.status && this.data.visible ? this.entered() : "leaving" !== this.status || this.data.visible || this.leaved());
  } } });
}
