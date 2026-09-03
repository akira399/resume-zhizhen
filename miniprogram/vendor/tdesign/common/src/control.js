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
  useControl: () => useControl
});
module.exports = __toCommonJS(stdin_exports);
const defaultOption = { valueKey: "value", defaultValueKey: "defaultValue", changeEventName: "change", strict: true };
function useControl(e = {}) {
  const { valueKey: t, defaultValueKey: a, changeEventName: n, strict: s } = Object.assign(Object.assign({}, defaultOption), e), l = this.properties || {}, i = l[t], u = l[s ? a : t];
  let o = false;
  s && null != i && (o = true);
  const c = (e2, a2, n2) => {
    this.setData(Object.assign({ [`_${t}`]: e2 }, a2), n2);
  };
  return { controlled: o, initValue: o ? i : u, set: c, get: () => this.data[`_${t}`], change: (e2, t2, a2) => {
    this.triggerEvent(n, void 0 !== t2 ? t2 : e2), o || ("function" == typeof a2 ? a2() : c(e2));
  } };
}
