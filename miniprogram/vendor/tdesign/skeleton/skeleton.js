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
const { prefix } = import_config.default, name = `${prefix}-skeleton`, ThemeMap = { avatar: [{ type: "circle", size: "96rpx" }], image: [{ type: "rect", size: "144rpx" }], text: [[{ width: "24%", height: "32rpx", marginRight: "32rpx" }, { width: "76%", height: "32rpx" }], 1], paragraph: [1, 1, 1, { width: "55%" }] };
let Skeleton = class extends import_src.SuperComponent {
  constructor() {
    super(...arguments), this.externalClasses = [`${prefix}-class`, `${prefix}-class-col`, `${prefix}-class-row`], this.properties = import_props.default, this.timer = void 0, this.data = { prefix, classPrefix: name, parsedRowCols: [] }, this.observers = { rowCol() {
      this.init();
    }, "loading, delay"() {
      this.isShowSkeleton();
    } }, this.lifetimes = { attached() {
      this.init(), this.isShowSkeleton();
    }, detached() {
      this.clearTimer();
    } }, this.methods = { init() {
      const { theme: e, rowCol: t } = this.properties, i = [];
      t.length ? i.push(...t) : i.push(...ThemeMap[e || "text"]);
      const s = i.map((e2) => {
        if ((0, import_validator.isInteger)(e2) && e2 >= 0) return new Array(e2).fill({ class: this.getColItemClass({ type: "text" }), style: {} });
        if (Array.isArray(e2)) return e2.map((e3) => Object.assign(Object.assign({}, e3), { class: this.getColItemClass(e3), style: this.getColItemStyle(e3) }));
        const t2 = e2;
        return [Object.assign(Object.assign({}, t2), { class: this.getColItemClass(t2), style: this.getColItemStyle(t2) })];
      });
      this.setData({ parsedRowCols: s });
    }, getColItemClass(e) {
      return (0, import_utils.classNames)([`${name}__col`, `${name}--type-${e.type || "text"}`, `${name}--animation-${this.properties.animation}`]);
    }, getColItemStyle(e) {
      const t = {};
      return ["width", "height", "marginRight", "marginLeft", "margin", "size", "background", "backgroundColor", "borderRadius"].forEach((i) => {
        if (i in e) {
          const s = (0, import_validator.isNumeric)(e[i]) ? `${e[i]}px` : e[i];
          "size" === i ? [t.width, t.height] = [s, s] : t[i] = s;
        }
      }), t;
    }, clearTimer() {
      this.timer && (clearTimeout(this.timer), this.timer = null);
    }, isShowSkeleton() {
      this.clearTimer();
      const { loading: e, delay: t } = this.properties;
      e && 0 !== t ? this.timer = setTimeout(() => {
        this.setData({ isShow: this.properties.loading });
      }, t) : this.setData({ isShow: e });
    } };
  }
};
Skeleton = (0, import_tslib.__decorate)([(0, import_src.wxComponent)()], Skeleton);
var stdin_default = Skeleton;
