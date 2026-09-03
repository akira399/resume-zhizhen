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
  default: () => TCalendar
});
module.exports = __toCommonJS(stdin_exports);
var import_date = require("../date");
class TCalendar {
  constructor(e = {}) {
    this.type = "single", Object.assign(this, e), this.minDate || (this.minDate = (0, import_date.getDate)()), this.maxDate || (this.maxDate = (0, import_date.getDate)(6));
  }
  getTrimValue() {
    const { value: e, type: t } = this, a = (e2) => e2 instanceof Date ? e2 : "number" == typeof e2 ? new Date(e2) : /* @__PURE__ */ new Date();
    if ("single" === t && (0, import_date.isValidDate)(e)) return a(e);
    if ("multiple" === t || "range" === t) {
      if (Array.isArray(e)) {
        return e.every((e2) => (0, import_date.isValidDate)(e2)) ? e.map((e2) => a(e2)) : [];
      }
      return [];
    }
  }
  getDays(e) {
    const t = [];
    let a = this.firstDayOfWeek % 7;
    for (; t.length < 7; ) t.push(e[a]), a = (a + 1) % 7;
    return t;
  }
  getMonths() {
    const e = [], t = this.getTrimValue(), { minDate: a, maxDate: i, type: r, allowSameDay: s, format: n } = this, m = (0, import_date.getDateRect)(a);
    let { year: l, month: o } = m;
    const { time: D } = m, { year: h, month: u, time: y } = (0, import_date.getDateRect)(i), c = (e2, a2, i2) => {
      const n2 = new Date(e2, a2, i2, 23, 59, 59);
      if ("single" === r && t && (0, import_date.isSameDate)({ year: e2, month: a2, date: i2 }, t)) return "selected";
      if ("multiple" === r && t) {
        if (t.some((t2) => (0, import_date.isSameDate)({ year: e2, month: a2, date: i2 }, t2))) return "selected";
      }
      if ("range" === r && t && Array.isArray(t)) {
        const [r2, m3] = t, l2 = r2 && (0, import_date.isSameDate)({ year: e2, month: a2, date: i2 }, r2), o2 = m3 && (0, import_date.isSameDate)({ year: e2, month: a2, date: i2 }, m3);
        if (l2 && o2 && s) return "start-end";
        if (l2) return "start";
        if (o2) return "end";
        if (r2 && m3 && n2.getTime() > r2.getTime() && n2.getTime() < m3.getTime()) return "centre";
      }
      const m2 = new Date(e2, a2, i2, 0, 0, 0);
      return n2.getTime() < D || m2.getTime() > y ? "disabled" : "";
    };
    for (; l < h || l === h && o <= u; ) {
      const t2 = (0, import_date.getMonthDateRect)(new Date(l, o, 1)), a2 = [];
      for (let e2 = 1; e2 <= 31 && !(e2 > t2.lastDate); e2 += 1) {
        const t3 = { date: new Date(l, o, e2), day: e2, type: c(l, o, e2) };
        a2.push(n ? n(t3) : t3);
      }
      e.push({ year: l, month: o, months: a2, weekdayOfFirstDay: t2.weekdayOfFirstDay });
      const i2 = (0, import_date.getDateRect)(new Date(l, o + 1, 1));
      l = i2.year, o = i2.month;
    }
    return e;
  }
  select({ cellType: e, year: t, month: a, date: i }) {
    const { type: r } = this, s = this.getTrimValue();
    if ("disabled" === e) return;
    const n = new Date(t, a, i);
    if (this.value = n, "range" === r && Array.isArray(s)) 1 === s.length && n >= s[0] ? this.value = [s[0], n] : this.value = [n];
    else if ("multiple" === r && Array.isArray(s)) {
      const e2 = [...s], t2 = s.findIndex((e3) => (0, import_date.isSameDate)(e3, n));
      t2 > -1 ? e2.splice(t2, 1) : e2.push(n), this.value = e2;
    }
    return this.value;
  }
}
