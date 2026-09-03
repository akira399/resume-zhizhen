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
  getPrototypeOf: () => getPrototypeOf,
  iterateInheritedPrototype: () => iterateInheritedPrototype,
  toObject: () => toObject
});
module.exports = __toCommonJS(stdin_exports);
var import_validator = require("../../common/validator");
const getPrototypeOf = function(t) {
  return Object.getPrototypeOf ? Object.getPrototypeOf(t) : t.__proto__;
};
const iterateInheritedPrototype = function(t, e, o, r = true) {
  let n = e.prototype || e;
  const c = o.prototype || o;
  for (; n && (r || n !== c) && false !== t(n) && n !== c; ) n = getPrototypeOf(n);
};
const toObject = function(t, e = {}) {
  const o = {};
  if (!(0, import_validator.isObject)(t)) return o;
  const r = e.excludes || ["constructor"], { enumerable: n = true, configurable: c = 0, writable: i = 0 } = e, p = {};
  return 0 !== n && (p.enumerable = n), 0 !== c && (p.configurable = c), 0 !== i && (p.writable = i), iterateInheritedPrototype((t2) => {
    Object.getOwnPropertyNames(t2).forEach((n2) => {
      if (r.indexOf(n2) >= 0) return;
      if (Object.prototype.hasOwnProperty.call(o, n2)) return;
      const c2 = Object.getOwnPropertyDescriptor(t2, n2);
      ["get", "set", "value"].forEach((t3) => {
        if ("function" == typeof c2[t3]) {
          const o2 = c2[t3];
          c2[t3] = function(...t4) {
            return o2.apply(Object.prototype.hasOwnProperty.call(e, "bindTo") ? e.bindTo : this, t4);
          };
        }
      }), Object.defineProperty(o, n2, Object.assign(Object.assign({}, c2), p));
    });
  }, t, e.till || Object, false), o;
};
