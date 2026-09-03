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
  isBoolean: () => isBoolean,
  isDate: () => isDate,
  isDef: () => isDef,
  isEmail: () => isEmail,
  isEmpty: () => isEmpty,
  isFunction: () => isFunction,
  isInteger: () => isInteger,
  isNull: () => isNull,
  isNumber: () => isNumber,
  isNumeric: () => isNumeric,
  isObject: () => isObject,
  isPlainObject: () => isPlainObject,
  isString: () => isString,
  isURL: () => isURL,
  isUndefined: () => isUndefined
});
module.exports = __toCommonJS(stdin_exports);
function isFunction(t) {
  return "function" == typeof t;
}
const isString = (t) => "string" == typeof t;
const isNull = (t) => null === t;
const isUndefined = (t) => void 0 === t;
function isDef(t) {
  return !isUndefined(t) && !isNull(t);
}
function isInteger(t) {
  return Number.isInteger(t);
}
function isNumeric(t) {
  return !Number.isNaN(Number(t));
}
function isNumber(t) {
  return "number" == typeof t;
}
function isBoolean(t) {
  return "boolean" == typeof t;
}
function isObject(t) {
  const e = typeof t;
  return null !== t && ("object" === e || "function" === e);
}
function isPlainObject(t) {
  return null !== t && "object" == typeof t && "[object Object]" === Object.prototype.toString.call(t);
}
function isEmpty(t) {
  return null == t || ("string" == typeof t || Array.isArray(t) ? 0 === t.length : t instanceof Map || t instanceof Set ? 0 === t.size : "object" != typeof t || 0 === Object.keys(t).length);
}
function isDate(t, e) {
  const r = Object.assign(Object.assign({}, { format: "YYYY/MM/DD", delimiters: ["/", "-"], strictMode: false }), e);
  if ("string" == typeof t) {
    const e2 = r.delimiters.find((t2) => r.format.includes(t2));
    if (!e2) return false;
    const n = r.format.split(e2), i = t.split(e2);
    if (n.length !== i.length) return false;
    let o = "", s = "", u = "";
    for (let t2 = 0; t2 < n.length; t2 += 1) {
      const e3 = n[t2].toUpperCase(), r2 = i[t2];
      e3.includes("Y") ? o = r2 : e3.includes("M") ? s = r2 : e3.includes("D") && (u = r2);
    }
    if (1 === s.length && (s = `0${s}`), 1 === u.length && (u = `0${u}`), 2 === o.length) {
      const t2 = (/* @__PURE__ */ new Date()).getFullYear() % 100;
      o = Number(o) <= t2 ? `20${o}` : `19${o}`;
    }
    const l = /* @__PURE__ */ new Date(`${o}-${s}-${u}T00:00:00.000Z`);
    return l.getUTCFullYear() === Number(o) && l.getUTCMonth() + 1 === Number(s) && l.getUTCDate() === Number(u);
  }
  return !(r.strictMode || "[object Date]" !== Object.prototype.toString.call(t) || !Number.isFinite(t.getTime()));
}
function isEmail(t) {
  if ("string" != typeof t) return false;
  if (t.length > 254) return false;
  const e = t.split("@");
  if (2 !== e.length) return false;
  const [r, n] = e;
  if (!r || r.length > 64) return false;
  if (!n) return false;
  if (/^[-.]/.test(n) || /[-.]$/.test(n)) return false;
  if (!/^[a-zA-Z0-9.-]+$/.test(n)) return false;
  if (!n.includes(".")) return false;
  const i = n.split(".").pop();
  if (!i || i.length < 2) return false;
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(r);
}
function isURL(t, e) {
  if ("string" != typeof t) return false;
  if (0 === t.length || /\s/.test(t)) return false;
  if (t.length > 2084) return false;
  const r = Object.assign(Object.assign({}, { protocols: ["http", "https", "ftp"], require_tld: true, require_protocol: false, require_host: true, allow_protocol_relative_urls: false }), e);
  let n = t;
  const i = n.match(/^([a-z][a-z0-9+\-.]*):\/\//i);
  if (i) {
    const t2 = i[1].toLowerCase();
    if (!r.protocols.includes(t2)) return false;
    n = n.slice(i[0].length);
  } else if (r.require_protocol) {
    if (!r.allow_protocol_relative_urls || !t.startsWith("//")) return false;
    n = n.slice(2);
  } else if (t.startsWith("//")) {
    if (!r.allow_protocol_relative_urls) return false;
    n = n.slice(2);
  }
  if (!n && r.require_host) return false;
  const [o] = n.split(/[/?#]/);
  if (!o && r.require_host) return false;
  let s = o;
  s.includes("@") && (s = s.split("@").pop() || "");
  let u = s;
  const l = s.match(/:(\d+)$/);
  if (l) {
    const t2 = Number(l[1]);
    if (t2 < 0 || t2 > 65535) return false;
    u = s.slice(0, s.lastIndexOf(":"));
  }
  if (!u) return false;
  const c = u.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (c) return c.slice(1).every((t2) => Number(t2) >= 0 && Number(t2) <= 255);
  if (u.startsWith("[") && u.endsWith("]")) return true;
  const f = u.split(".");
  if (r.require_tld && f.length < 2) return false;
  if (f.some((t2) => !t2 || t2.length > 63 || (!/^[a-zA-Z0-9-]+$/.test(t2) || !(!t2.startsWith("-") && !t2.endsWith("-"))))) return false;
  if (r.require_tld) {
    const t2 = f[f.length - 1];
    if (/^\d+$/.test(t2)) return false;
  }
  return true;
}
