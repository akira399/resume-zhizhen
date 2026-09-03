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
const { prefix } = import_config.default, name = `${prefix}-icon`;
let Icon = class extends import_src.SuperComponent {
  constructor() {
    super(...arguments), this.externalClasses = [`${prefix}-class`], this.properties = import_props.default, this.data = { componentPrefix: prefix, classPrefix: name, isImage: false, iconStyle: void 0 }, this.observers = { "name, color, size, style"() {
      this.setIconStyle();
    } }, this.methods = { onTap(t) {
      this.triggerEvent("click", t.detail);
    }, setIconStyle() {
      const { name: t, color: e, size: o, classPrefix: i } = this.data, s = -1 !== t.indexOf("/"), n = null !== o && "" !== o ? (0, import_utils.addUnit)(o) : void 0, r = e ? { color: e } : {}, c = o ? { "font-size": n } : {}, a = Object.assign(Object.assign({}, r), c);
      this.setData({ isImage: s }, () => (0, import_tslib.__awaiter)(this, void 0, void 0, function* () {
        if (s) {
          let t2 = n;
          t2 || (yield (0, import_utils.getRect)(this, `.${i}`).then((e2) => {
            t2 = (0, import_utils.addUnit)(null == e2 ? void 0 : e2.height);
          }).catch(() => {
          })), a.width = t2, a.height = t2;
        }
        this.setData({ iconStyle: `${(0, import_utils.styles)(a)}` });
      }));
    } };
  }
};
Icon = (0, import_tslib.__decorate)([(0, import_src.wxComponent)()], Icon);
var stdin_default = Icon;
