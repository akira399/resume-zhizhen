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
var import_props = __toESM(require("./props"));
var import_config = __toESM(require("../common/config"));
var import_utils = require("../common/utils");
var import_version = require("../common/version");
const { prefix } = import_config.default, name = `${prefix}-image`;
let Image = class extends import_src.SuperComponent {
  constructor() {
    super(...arguments), this.externalClasses = [`${prefix}-class`, `${prefix}-class-load`, `${prefix}-class-image`, `${prefix}-class-error`], this.options = { multipleSlots: true }, this.properties = import_props.default, this.data = { prefix, isLoading: true, isFailed: false, innerStyle: "", classPrefix: name }, this.preSrc = void 0, this.observers = { src() {
      this.preSrc !== this.properties.src && this.update();
    }, "width, height"(e, i) {
      this.calcSize(e, i);
    } }, this.methods = { onLoaded(e) {
      const i = import_utils.appBaseInfo.SDKVersion, { mode: t, tId: s } = this.properties, r = (0, import_version.compareVersion)(i, "2.10.3") < 0;
      if ("heightFix" === t && r) {
        const { height: i2, width: t2 } = e.detail;
        (0, import_utils.getRect)(this, `#${s || "image"}`).then((e2) => {
          const { height: s2 } = e2, r2 = (s2 / i2 * t2).toFixed(2);
          this.setData({ innerStyle: `height: ${(0, import_utils.addUnit)(s2)}; width: ${r2}px;` });
        });
      }
      this.setData({ isLoading: false, isFailed: false }), this.triggerEvent("load", e.detail);
    }, onLoadError(e) {
      this.setData({ isLoading: false, isFailed: true }), this.triggerEvent("error", e.detail);
    }, calcSize(e, i) {
      let t = "";
      e && (t += `width: ${(0, import_utils.addUnit)(e)};`), i && (t += `height: ${(0, import_utils.addUnit)(i)};`), this.setData({ innerStyle: t });
    }, update() {
      const { src: e } = this.properties;
      this.preSrc = e, e ? this.setData({ isLoading: true, isFailed: false }) : this.onLoadError({ errMsg: "\u56FE\u7247\u94FE\u63A5\u4E3A\u7A7A" });
    } };
  }
};
Image = (0, import_tslib.__decorate)([(0, import_src.wxComponent)()], Image);
var stdin_default = Image;
