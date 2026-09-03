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
var import_page_scroll = __toESM(require("../mixins/page-scroll"));
var import_utils = require("../common/utils");
const { prefix } = import_config.default, name = `${prefix}-sticky`, ContainerClass = `.${name}`;
let Sticky = class extends import_src.SuperComponent {
  constructor() {
    super(...arguments), this.externalClasses = [`${prefix}-class`, `${prefix}-class-content`], this.properties = import_props.default, this.behaviors = [(0, import_page_scroll.default)()], this.observers = { "offsetTop, disabled, container"() {
      this.onScroll();
    } }, this.data = { prefix, classPrefix: name, containerStyle: "", contentStyle: "" }, this.methods = { onScroll(t) {
      const { scrollTop: e } = t || {}, { container: i, offsetTop: o, disabled: s } = this.properties;
      s ? this.setDataAfterDiff({ isFixed: false, transform: 0 }) : (this.scrollTop = e || this.scrollTop, "function" != typeof i ? (0, import_utils.getRect)(this, ContainerClass).then((t2) => {
        t2 && (o >= t2.top ? (this.setDataAfterDiff({ isFixed: true, height: t2.height }), this.transform = 0) : this.setDataAfterDiff({ isFixed: false }));
      }) : Promise.all([(0, import_utils.getRect)(this, ContainerClass), this.getContainerRect()]).then(([t2, e2]) => {
        t2 && e2 && (o + t2.height > e2.height + e2.top ? this.setDataAfterDiff({ isFixed: false, transform: e2.height - t2.height }) : o >= t2.top ? this.setDataAfterDiff({ isFixed: true, height: t2.height, transform: 0 }) : this.setDataAfterDiff({ isFixed: false, transform: 0 }));
      }));
    }, setDataAfterDiff(t) {
      const { offsetTop: e } = this.properties, { containerStyle: i, contentStyle: o } = this.data, { isFixed: s, height: r, transform: n } = t;
      wx.nextTick(() => {
        let t2 = "", a = "";
        if (s && (t2 += `height:${r}px;`, a += `position:fixed;top:${e}px;left:0;right:0;`), n) {
          const t3 = `translate3d(0, ${n}px, 0)`;
          a += `-webkit-transform:${t3};transform:${t3};`;
        }
        i === t2 && o === a || this.setData({ containerStyle: t2, contentStyle: a }), this.triggerEvent("scroll", { scrollTop: this.scrollTop, isFixed: s });
      });
    }, getContainerRect() {
      const t = this.properties.container();
      return new Promise((e) => t.boundingClientRect(e).exec());
    } };
  }
  ready() {
    this.onScroll();
  }
};
Sticky = (0, import_tslib.__decorate)([(0, import_src.wxComponent)()], Sticky);
var stdin_default = Sticky;
