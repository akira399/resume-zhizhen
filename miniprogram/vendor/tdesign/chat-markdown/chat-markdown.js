var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
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
  default: () => stdin_default
});
module.exports = __toCommonJS(stdin_exports);
var import_tslib = require("../tslib/tslib.js");
var import_marked = require("../marked/lib/marked.js");
var import_src = require("../common/src/index");
var import_config = __toESM(require("../common/config"));
var import_props = __toESM(require("./props"));
const { prefix } = import_config.default, name = `${prefix}-chat-markdown`, DEFAULT_TAIL_CONTENT = "\u258B";
function resolveTailContent(t) {
  return t ? "boolean" == typeof t ? "\u258B" : t.content || "\u258B" : null;
}
function flatListItems(t) {
  return t.reduce((t2, e) => {
    var o;
    return (null === (o = e.tokens) || void 0 === o ? void 0 : o.length) && t2.push(...e.tokens), t2;
  }, []);
}
function injectTailToTokens(t, e, o = 0) {
  var n, r, i, s, a;
  for (let l = t.length - 1; l >= 0; l -= 1) {
    const d = t[l];
    if ("code" === d.type && (null === (n = d.text || d.raw) || void 0 === n ? void 0 : n.trim())) return d.isTail = true, d.tailContent = e, true;
    if ("text" === d.type && (null === (r = d.text || d.raw) || void 0 === r ? void 0 : r.trim())) return d.isTail = true, d.tailContent = e, true;
    if ("table" === d.type) {
      const t2 = [...d.header ? [d.header] : [], ...d.rows || []];
      for (let n2 = t2.length - 1; n2 >= 0; n2 -= 1) {
        const r2 = t2[n2];
        for (let t3 = r2.length - 1; t3 >= 0; t3 -= 1) {
          const n3 = r2[t3];
          if ((null === (i = n3.tokens) || void 0 === i ? void 0 : i.length) && injectTailToTokens(n3.tokens, e, o + 1)) return true;
        }
      }
    } else {
      let t2 = null;
      if ((null === (s = d.tokens) || void 0 === s ? void 0 : s.length) ? t2 = d.tokens : (null === (a = d.items) || void 0 === a ? void 0 : a.length) && (t2 = flatListItems(d.items)), (null == t2 ? void 0 : t2.length) && injectTailToTokens(t2, e, o + 1)) return true;
    }
  }
  return false;
}
let ChatMarkdown = class extends import_src.SuperComponent {
  constructor() {
    super(...arguments), this.options = { multipleSlots: true }, this.properties = import_props.default, this.data = { classPrefix: name, nodes: [], name }, this.observers = { content: function(t) {
      this.parseMarkdown(t);
    }, streaming: function() {
      this.parseMarkdown(this.data.content);
    } }, this.methods = { parseMarkdown(t) {
      try {
        const e = new import_marked.Lexer(this.data.options).lex(t), { streaming: o } = this.data, n = resolveTailContent(null == o ? void 0 : o.tail);
        (null == o ? void 0 : o.hasNextChunk) && n && injectTailToTokens(e, n), this.setData({ nodes: e });
      } catch (e) {
        console.error("Markdown parsing error:", e), this.setData({ nodes: [{ type: "text", raw: t, text: t }] });
      }
    } }, this.lifetimes = { attached() {
    } };
  }
};
ChatMarkdown = (0, import_tslib.__decorate)([(0, import_src.wxComponent)()], ChatMarkdown);
var stdin_default = ChatMarkdown;
