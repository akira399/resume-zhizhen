!(function(e, t) {
  "object" == typeof exports && "undefined" != typeof module ? module.exports = t(require("../dayjs.min.js")) : "function" == typeof define && define.amd ? define(["dayjs"], t) : (e = "undefined" != typeof globalThis ? globalThis : e || self).dayjs_locale_ar = t(e.dayjs);
})(exports, (function(e) {
  "use strict";
  function t(e2) {
    return e2 && "object" == typeof e2 && "default" in e2 ? e2 : { default: e2 };
  }
  var n = t(e), r = "\u064A\u0646\u0627\u064A\u0631_\u0641\u0628\u0631\u0627\u064A\u0631_\u0645\u0627\u0631\u0633_\u0623\u0628\u0631\u064A\u0644_\u0645\u0627\u064A\u0648_\u064A\u0648\u0646\u064A\u0648_\u064A\u0648\u0644\u064A\u0648_\u0623\u063A\u0633\u0637\u0633_\u0633\u0628\u062A\u0645\u0628\u0631_\u0623\u0643\u062A\u0648\u0628\u0631_\u0646\u0648\u0641\u0645\u0628\u0631_\u062F\u064A\u0633\u0645\u0628\u0631".split("_"), d = { 1: "\u0661", 2: "\u0662", 3: "\u0663", 4: "\u0664", 5: "\u0665", 6: "\u0666", 7: "\u0667", 8: "\u0668", 9: "\u0669", 0: "\u0660" }, _ = { "\u0661": "1", "\u0662": "2", "\u0663": "3", "\u0664": "4", "\u0665": "5", "\u0666": "6", "\u0667": "7", "\u0668": "8", "\u0669": "9", "\u0660": "0" }, o = /[١٢٣٤٥٦٧٨٩٠]/g, i = /،/g, a = /\d/g, s = /,/g, u = { name: "ar", weekdays: "\u0627\u0644\u0623\u062D\u062F_\u0627\u0644\u0625\u062B\u0646\u064A\u0646_\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621_\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621_\u0627\u0644\u062E\u0645\u064A\u0633_\u0627\u0644\u062C\u0645\u0639\u0629_\u0627\u0644\u0633\u0628\u062A".split("_"), weekdaysShort: "\u0623\u062D\u062F_\u0625\u062B\u0646\u064A\u0646_\u062B\u0644\u0627\u062B\u0627\u0621_\u0623\u0631\u0628\u0639\u0627\u0621_\u062E\u0645\u064A\u0633_\u062C\u0645\u0639\u0629_\u0633\u0628\u062A".split("_"), weekdaysMin: "\u062D_\u0646_\u062B_\u0631_\u062E_\u062C_\u0633".split("_"), months: r, monthsShort: r, weekStart: 6, meridiem: function(e2) {
    return e2 > 12 ? "\u0645" : "\u0635";
  }, relativeTime: { future: "\u0628\u0639\u062F %s", past: "\u0645\u0646\u0630 %s", s: "\u062B\u0627\u0646\u064A\u0629 \u0648\u0627\u062D\u062F\u0629", m: "\u062F\u0642\u064A\u0642\u0629 \u0648\u0627\u062D\u062F\u0629", mm: "%d \u062F\u0642\u0627\u0626\u0642", h: "\u0633\u0627\u0639\u0629 \u0648\u0627\u062D\u062F\u0629", hh: "%d \u0633\u0627\u0639\u0627\u062A", d: "\u064A\u0648\u0645 \u0648\u0627\u062D\u062F", dd: "%d \u0623\u064A\u0627\u0645", M: "\u0634\u0647\u0631 \u0648\u0627\u062D\u062F", MM: "%d \u0623\u0634\u0647\u0631", y: "\u0639\u0627\u0645 \u0648\u0627\u062D\u062F", yy: "%d \u0623\u0639\u0648\u0627\u0645" }, preparse: function(e2) {
    return e2.replace(o, (function(e3) {
      return _[e3];
    })).replace(i, ",");
  }, postformat: function(e2) {
    return e2.replace(a, (function(e3) {
      return d[e3];
    })).replace(s, "\u060C");
  }, ordinal: function(e2) {
    return e2;
  }, formats: { LT: "HH:mm", LTS: "HH:mm:ss", L: "D/\u200FM/\u200FYYYY", LL: "D MMMM YYYY", LLL: "D MMMM YYYY HH:mm", LLLL: "dddd D MMMM YYYY HH:mm" } };
  return n.default.locale(u, null, true), u;
}));
