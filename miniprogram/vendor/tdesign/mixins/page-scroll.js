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
const onPageScroll = function(r) {
  const e = (0, import_utils.getCurrentPage)();
  if (!e) return;
  const { pageScroller: o } = e;
  null == o || o.forEach((e2) => {
    "function" == typeof e2 && e2(r);
  });
};
var stdin_default = (r = "onScroll") => Behavior({ attached() {
  var e;
  const o = (0, import_utils.getCurrentPage)();
  if (!o) return;
  const l = null === (e = this[r]) || void 0 === e ? void 0 : e.bind(this);
  l && (this._pageScroller = l), Array.isArray(o.pageScroller) ? o.pageScroller.push(l) : o.pageScroller = "function" == typeof o.onPageScroll ? [o.onPageScroll.bind(o), l] : [l], o.onPageScroll = onPageScroll;
}, detached() {
  var r2;
  const e = (0, import_utils.getCurrentPage)();
  e && (e.pageScroller = (null === (r2 = e.pageScroller) || void 0 === r2 ? void 0 : r2.filter((r3) => r3 !== this._pageScroller)) || []);
} });
