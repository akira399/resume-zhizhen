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
  Color: () => Color,
  default: () => stdin_default,
  genGradientPoint: () => genGradientPoint,
  genId: () => genId,
  getColorObject: () => getColorObject,
  getColorWithoutAlpha: () => getColorWithoutAlpha,
  gradientColors2string: () => gradientColors2string
});
module.exports = __toCommonJS(stdin_exports);
var import_tinycolor = __toESM(require("../../../tinycolor2/esm/tinycolor.js"));
var import_cmyk = require("./cmyk");
var import_gradient = require("./gradient");
const mathRound = Math.round, hsv2rgba = (t) => (0, import_tinycolor.default)(t).toRgb(), hsv2hsva = (t) => (0, import_tinycolor.default)(t).toHsv(), hsv2hsla = (t) => (0, import_tinycolor.default)(t).toHsl();
const gradientColors2string = (t) => {
  const { points: e, degree: r } = t;
  return `linear-gradient(${r}deg,${e.sort((t2, e2) => t2.left - e2.left).map((t2) => `${t2.color} ${Math.round(100 * t2.left) / 100}%`).join(",")})`;
};
const getColorWithoutAlpha = (t) => (0, import_tinycolor.default)(t).setAlpha(1).toHexString();
const genId = () => (1 + 4294967295 * Math.random()).toString(16);
const genGradientPoint = (t, e) => ({ id: genId(), left: t, color: e });
class Color {
  constructor(t) {
    this.states = { s: 100, v: 100, h: 100, a: 1 }, this.gradientStates = { colors: [], degree: 0, selectedId: null, css: "" }, this.update(t);
  }
  update(t) {
    var e, r;
    const s = (0, import_gradient.parseGradientString)(t);
    if (this.isGradient && !s) {
      const e2 = (0, import_tinycolor.default)(t).toHsv();
      return this.states = e2, void this.updateCurrentGradientColor();
    }
    this.originColor = t, this.isGradient = false;
    let a = t;
    if (s) {
      this.isGradient = true;
      const t2 = s, i = t2.points.map((t3) => genGradientPoint(t3.left, t3.color));
      this.gradientStates = { colors: i, degree: t2.degree, selectedId: (null === (e = i[0]) || void 0 === e ? void 0 : e.id) || null }, this.gradientStates.css = this.linearGradient, a = null === (r = this.gradientSelectedPoint) || void 0 === r ? void 0 : r.color;
    }
    this.updateStates(a);
  }
  get saturation() {
    return this.states.s;
  }
  set saturation(t) {
    this.states.s = Math.max(0, Math.min(100, t)), this.updateCurrentGradientColor();
  }
  get value() {
    return this.states.v;
  }
  set value(t) {
    this.states.v = Math.max(0, Math.min(100, t)), this.updateCurrentGradientColor();
  }
  get hue() {
    return this.states.h;
  }
  set hue(t) {
    this.states.h = Math.max(0, Math.min(360, t)), this.updateCurrentGradientColor();
  }
  get alpha() {
    return this.states.a;
  }
  set alpha(t) {
    this.states.a = Math.max(0, Math.min(1, Math.round(100 * t) / 100)), this.updateCurrentGradientColor();
  }
  get rgb() {
    const { r: t, g: e, b: r } = hsv2rgba(this.states);
    return `rgb(${mathRound(t)}, ${mathRound(e)}, ${mathRound(r)})`;
  }
  get rgba() {
    const { r: t, g: e, b: r, a: s } = hsv2rgba(this.states);
    return `rgba(${mathRound(t)}, ${mathRound(e)}, ${mathRound(r)}, ${s})`;
  }
  get hsv() {
    const { h: t, s: e, v: r } = this.getHsva();
    return `hsv(${t}, ${e}%, ${r}%)`;
  }
  get hsva() {
    const { h: t, s: e, v: r, a: s } = this.getHsva();
    return `hsva(${t}, ${e}%, ${r}%, ${s})`;
  }
  get hsl() {
    const { h: t, s: e, l: r } = this.getHsla();
    return `hsl(${t}, ${e}%, ${r}%)`;
  }
  get hsla() {
    const { h: t, s: e, l: r, a: s } = this.getHsla();
    return `hsla(${t}, ${e}%, ${r}%, ${s})`;
  }
  get hex() {
    return (0, import_tinycolor.default)(this.states).toHexString();
  }
  get hex8() {
    return (0, import_tinycolor.default)(this.states).toHex8String();
  }
  get cmyk() {
    const { c: t, m: e, y: r, k: s } = this.getCmyk();
    return `cmyk(${t}, ${e}, ${r}, ${s})`;
  }
  get css() {
    return this.isGradient ? this.linearGradient : this.rgba;
  }
  get linearGradient() {
    const { gradientColors: t, gradientDegree: e } = this;
    return gradientColors2string({ points: t, degree: e });
  }
  get gradientColors() {
    return this.gradientStates.colors;
  }
  set gradientColors(t) {
    this.gradientStates.colors = t, this.gradientStates.css = this.linearGradient;
  }
  get gradientSelectedId() {
    return this.gradientStates.selectedId;
  }
  set gradientSelectedId(t) {
    var e;
    t !== this.gradientSelectedId && (this.gradientStates.selectedId = t, this.updateStates(null === (e = this.gradientSelectedPoint) || void 0 === e ? void 0 : e.color));
  }
  get gradientDegree() {
    return this.gradientStates.degree;
  }
  set gradientDegree(t) {
    this.gradientStates.degree = Math.max(0, Math.min(360, t)), this.gradientStates.css = this.linearGradient;
  }
  get gradientSelectedPoint() {
    const { gradientColors: t, gradientSelectedId: e } = this;
    return t.find((t2) => t2.id === e);
  }
  getFormatsColorMap() {
    return { HEX: this.hex, CMYK: this.cmyk, RGB: this.rgb, RGBA: this.rgba, HSL: this.hsl, HSLA: this.hsla, HSV: this.hsv, HSVA: this.hsva, CSS: this.css, HEX8: this.hex8 };
  }
  updateCurrentGradientColor() {
    const { isGradient: t, gradientColors: e, gradientSelectedId: r } = this, { length: s } = e, a = this.gradientSelectedPoint;
    if (!t || 0 === s || !a) return false;
    const i = e.findIndex((t2) => t2.id === r), n = Object.assign(Object.assign({}, a), { color: this.rgba });
    return e.splice(i, 1, n), this.gradientColors = e.slice(), this;
  }
  updateStates(t) {
    const e = (0, import_tinycolor.default)((0, import_cmyk.cmykInputToColor)(t)).toHsv();
    this.states = e;
  }
  getRgba() {
    const { r: t, g: e, b: r, a: s } = hsv2rgba(this.states);
    return { r: mathRound(t), g: mathRound(e), b: mathRound(r), a: s };
  }
  getCmyk() {
    const { r: t, g: e, b: r } = this.getRgba(), [s, a, i, n] = (0, import_cmyk.rgb2cmyk)(t, e, r);
    return { c: mathRound(100 * s), m: mathRound(100 * a), y: mathRound(100 * i), k: mathRound(100 * n) };
  }
  getHsva() {
    let { h: t, s: e, v: r, a: s } = hsv2hsva(this.states);
    return t = mathRound(t), e = mathRound(100 * e), r = mathRound(100 * r), s *= 1, { h: t, s: e, v: r, a: s };
  }
  getHsla() {
    let { h: t, s: e, l: r, a: s } = hsv2hsla(this.states);
    return t = mathRound(t), e = mathRound(100 * e), r = mathRound(100 * r), s *= 1, { h: t, s: e, l: r, a: s };
  }
  equals(t) {
    return import_tinycolor.default.equals(this.rgba, t);
  }
  static isValid(t) {
    return !!(0, import_gradient.parseGradientString)(t) || (0, import_tinycolor.default)(t).isValid();
  }
  static hsva2color(t, e, r, s) {
    return (0, import_tinycolor.default)({ h: t, s: e, v: r, a: s }).toHsvString();
  }
  static hsla2color(t, e, r, s) {
    return (0, import_tinycolor.default)({ h: t, s: e, l: r, a: s }).toHslString();
  }
  static rgba2color(t, e, r, s) {
    return (0, import_tinycolor.default)({ r: t, g: e, b: r, a: s }).toHsvString();
  }
  static hex2color(t, e) {
    const r = (0, import_tinycolor.default)(t);
    return r.setAlpha(e), r.toHexString();
  }
  static object2color(t, e) {
    if ("CMYK" === e) {
      const { c: e2, m: r, y: s, k: a } = t;
      return `cmyk(${e2}, ${r}, ${s}, ${a})`;
    }
    return (0, import_tinycolor.default)(t, { format: e }).toRgbString();
  }
}
Color.isGradientColor = (t) => !!(0, import_gradient.isGradientColor)(t), Color.compare = (t, e) => {
  const r = Color.isGradientColor(t), s = Color.isGradientColor(e);
  if (r && s) {
    return gradientColors2string((0, import_gradient.parseGradientString)(t)) === gradientColors2string((0, import_gradient.parseGradientString)(e));
  }
  return !r && !s && import_tinycolor.default.equals(t, e);
};
const COLOR_OBJECT_OUTPUT_KEYS = ["alpha", "css", "hex", "hex8", "hsl", "hsla", "hsv", "hsva", "rgb", "rgba", "saturation", "value", "isGradient"];
const getColorObject = (t) => {
  if (!t) return null;
  const e = /* @__PURE__ */ Object.create(null);
  return COLOR_OBJECT_OUTPUT_KEYS.forEach((r) => e[r] = t[r]), t.isGradient && (e.linearGradient = t.linearGradient), e;
};
var stdin_default = Color;
