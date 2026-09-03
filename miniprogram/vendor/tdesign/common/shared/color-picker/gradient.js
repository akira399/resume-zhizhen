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
  default: () => stdin_default,
  isGradientColor: () => isGradientColor,
  parseGradientString: () => parseGradientString
});
module.exports = __toCommonJS(stdin_exports);
var import_tinycolor = __toESM(require("../../../tinycolor2/esm/tinycolor.js"));
var import_validator = require("../../validator");
const combineRegExp = (e, t) => {
  let o = "";
  for (let t2 = 0; t2 < e.length; t2 += 1) (0, import_validator.isString)(e[t2]) ? o += e[t2] : o += e[t2].source;
  return new RegExp(o, t);
}, generateRegExp = () => {
  const e = /\s*,\s*/, t = /(?:[+-]?\d*\.?\d+)(?:%|[a-z]+)?/, o = combineRegExp(["(?:", /#(?:[a-f0-9]{6}|[a-f0-9]{3})/, "|", "(?:rgb|hsl)", /\(\s*(?:\d{1,3}\s*,\s*){2}\d{1,3}\s*\)/, "|", "(?:rgba|hsla)", /\(\s*(?:\d{1,3}\s*,\s*){2}\d{1,3}\s*,\s*\d*\.?\d+\)/, "|", /[_a-z-][_a-z0-9-]*/, ")"], ""), r = combineRegExp([o, "(?:\\s+", t, "(?:\\s+", t, ")?)?"], ""), i = combineRegExp(["(?:", r, e, ")*", r], ""), n = combineRegExp(["(?:(", /(?:[+-]?\d*\.?\d+)(?:deg|grad|rad|turn)/, ")|", /to\s+((?:(?:left|right|top|bottom)(?:\s+(?:top|bottom|left|right))?))/, ")"], "");
  return { gradientSearch: combineRegExp(["(?:(", n, ")", e, ")?(", i, ")"], "gi"), colorStopSearch: combineRegExp(["\\s*(", o, ")", "(?:\\s+", "(", t, "))?", "(?:", e, "\\s*)?"], "gi") };
}, parseGradient = (e, t) => {
  let o, r, i;
  e.gradientSearch.lastIndex = 0;
  const n = e.gradientSearch.exec(t);
  if (!(0, import_validator.isNull)(n)) for (o = { original: n[0], colorStopList: [] }, n[1] && (o.line = n[1]), n[2] && (o.angle = n[2]), n[3] && (o.sideCorner = n[3]), e.colorStopSearch.lastIndex = 0, r = e.colorStopSearch.exec(n[4]); !(0, import_validator.isNull)(r); ) i = { color: r[1] }, r[2] && (i.position = r[2]), o.colorStopList.push(i), r = e.colorStopSearch.exec(n[4]);
  return o;
}, REGEXP_LIB = generateRegExp(), REG_GRADIENT = /.*gradient\s*\(((?:\([^)]*\)|[^)(]*)*)\)/gim;
const isGradientColor = (e) => (REG_GRADIENT.lastIndex = 0, REG_GRADIENT.exec(e));
const sideCornerDegreeMap = { top: 0, right: 90, bottom: 180, left: 270, "top left": 225, "left top": 225, "top right": 135, "right top": 135, "bottom left": 315, "left bottom": 315, "bottom right": 45, "right bottom": 45 };
const parseGradientString = (e) => {
  const t = isGradientColor(e);
  if (!t) return false;
  const o = { points: [], degree: 0 }, r = parseGradient(REGEXP_LIB, t[1]);
  if (r.original.trim() !== t[1].trim()) return false;
  const i = r.colorStopList.map(({ color: e2, position: t2 }) => {
    const o2 = /* @__PURE__ */ Object.create(null);
    return o2.color = (0, import_tinycolor.default)(e2).toRgbString(), o2.left = parseFloat(t2), o2;
  });
  o.points = i;
  let n = parseInt(r.angle, 10);
  return Number.isNaN(n) && (n = sideCornerDegreeMap[r.sideCorner] || 90), o.degree = n, o;
};
var stdin_default = parseGradientString;
