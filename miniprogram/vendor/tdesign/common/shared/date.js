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
  getDate: () => getDate,
  getDateRect: () => getDateRect,
  getMonthDateRect: () => getMonthDateRect,
  isSameDate: () => isSameDate,
  isValidDate: () => isValidDate
});
module.exports = __toCommonJS(stdin_exports);
const getDateRect = (e) => {
  const t = new Date(e);
  return { year: t.getFullYear(), month: t.getMonth(), date: t.getDate(), day: t.getDay(), time: t.getTime() };
};
const isSameDate = (e, t) => {
  (e instanceof Date || "number" == typeof e) && (e = getDateRect(e)), (t instanceof Date || "number" == typeof t) && (t = getDateRect(t));
  return ["year", "month", "date"].every((a) => e[a] === t[a]);
};
const getMonthDateRect = (e) => {
  const { year: t, month: a } = getDateRect(e);
  return { year: t, month: a, weekdayOfFirstDay: new Date(t, a, 1).getDay(), lastDate: new Date(+new Date(t, a + 1, 1) - 864e5).getDate() };
};
const isValidDate = (e) => "number" == typeof e || e instanceof Date;
const getDate = (...e) => {
  const t = /* @__PURE__ */ new Date();
  if (0 === e.length) return t;
  if (1 === e.length && e[0] <= 1e3) {
    const { year: a, month: n, date: r } = getDateRect(t);
    return new Date(a, n + e[0], r);
  }
  return Date.apply(null, e);
};
