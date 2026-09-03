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
  getComponentLocale: () => getComponentLocale,
  useConfig: () => useConfig
});
module.exports = __toCommonJS(stdin_exports);
var import_config_store = require("./config-store");
function getComponentLocale(e, o, t, n) {
  var r;
  let c = {};
  n && (c = (null === (r = e.properties) || void 0 === r ? void 0 : r[n]) || {});
  const i = import_config_store.configStore.currentLocale.value, s = i && i[o] || {};
  return Object.assign(Object.assign(Object.assign({}, t), s), c);
}
function useConfig(e) {
  return { getLocale: (o, t) => getComponentLocale(t, e, o), subscribeLocale: (e2, o) => import_config_store.configStore.currentLocale.subscribe((e3) => {
    o(e3);
  }) };
}
