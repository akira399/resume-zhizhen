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
  DEFAULT_BACKGROUND_COLOR: () => DEFAULT_BACKGROUND_COLOR,
  DEFAULT_FRONT_COLOR: () => DEFAULT_FRONT_COLOR,
  DEFAULT_IMG_SCALE: () => DEFAULT_IMG_SCALE,
  DEFAULT_LEVEL: () => DEFAULT_LEVEL,
  DEFAULT_MARGIN_SIZE: () => DEFAULT_MARGIN_SIZE,
  DEFAULT_MINVERSION: () => DEFAULT_MINVERSION,
  DEFAULT_NEED_MARGIN: () => DEFAULT_NEED_MARGIN,
  DEFAULT_SIZE: () => DEFAULT_SIZE,
  ERROR_LEVEL_MAP: () => ERROR_LEVEL_MAP,
  SPEC_MARGIN_SIZE: () => SPEC_MARGIN_SIZE,
  excavateModules: () => excavateModules,
  generatePath: () => generatePath,
  getImageSettings: () => getImageSettings,
  getMarginSize: () => getMarginSize,
  isSupportPath2d: () => isSupportPath2d
});
module.exports = __toCommonJS(stdin_exports);
var import_qrcodegen = require("./qrcodegen");
const ERROR_LEVEL_MAP = { L: import_qrcodegen.Ecc.LOW, M: import_qrcodegen.Ecc.MEDIUM, Q: import_qrcodegen.Ecc.QUARTILE, H: import_qrcodegen.Ecc.HIGH };
const DEFAULT_SIZE = 160;
const DEFAULT_LEVEL = "M";
const DEFAULT_BACKGROUND_COLOR = "#FFFFFF";
const DEFAULT_FRONT_COLOR = "#000000";
const DEFAULT_NEED_MARGIN = false;
const DEFAULT_MINVERSION = 1;
const SPEC_MARGIN_SIZE = 4;
const DEFAULT_MARGIN_SIZE = 0;
const DEFAULT_IMG_SCALE = 0.1;
const generatePath = (t, o = 0) => {
  const e = [];
  return t.forEach((t2, n) => {
    let r = null;
    t2.forEach((c, l) => {
      if (!c && null !== r) return e.push(`M${r + o} ${n + o}h${l - r}v1H${r + o}z`), void (r = null);
      if (l !== t2.length - 1) c && null === r && (r = l);
      else {
        if (!c) return;
        null === r ? e.push(`M${l + o},${n + o} h1v1H${l + o}z`) : e.push(`M${r + o},${n + o} h${l + 1 - r}v1H${r + o}z`);
      }
    });
  }), e.join("");
};
const excavateModules = (t, o) => t.slice().map((t2, e) => e < o.y || e >= o.y + o.h ? t2 : t2.map((t3, e2) => (e2 < o.x || e2 >= o.x + o.w) && t3));
const getImageSettings = (t, o, e, n) => {
  if (null == n) return null;
  const r = t.length + 2 * e, c = Math.floor(0.1 * o), l = r / o, a = (n.width || c) * l, h = (n.height || c) * l, s = null == n.x ? t.length / 2 - a / 2 : n.x * l, E = null == n.y ? t.length / 2 - h / 2 : n.y * l, p = null == n.opacity ? 1 : n.opacity;
  let i = null;
  if (n.excavate) {
    const t2 = Math.floor(s), o2 = Math.floor(E);
    i = { x: t2, y: o2, w: Math.ceil(a + s - t2), h: Math.ceil(h + E - o2) };
  }
  const { crossOrigin: x } = n;
  return { x: s, y: E, h, w: a, excavation: i, opacity: p, crossOrigin: x };
};
const getMarginSize = (t, o) => null != o ? Math.max(Math.floor(o), 0) : t ? 4 : 0;
const isSupportPath2d = (() => {
  try {
    new Path2D().addPath(new Path2D());
  } catch (t) {
    return false;
  }
  return true;
})();
