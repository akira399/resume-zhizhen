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
var import_tslib = require("../../tslib/tslib.js");
var import_src = require("../../common/src/index");
var import_config = __toESM(require("../../common/config"));
const { prefix } = import_config.default, name = `${prefix}-chat-markdown`;
let ChatMarkdownNode = class extends import_src.SuperComponent {
  constructor() {
    super(...arguments), this.options = { multipleSlots: true }, this.properties = { nodes: { type: Array, value: () => [] } }, this.data = { classPrefix: name }, this.methods = { nodeClick(t) {
      var e;
      const { index: a } = t.currentTarget.dataset || {}, o = null === (e = this.data.nodes) || void 0 === e ? void 0 : e[a];
      this.handleClick(t, "node-tap", o);
    }, getCareMarkdown() {
      if (this.data.careMarkdown) return this.data.careMarkdown;
      for (this.setData({ careMarkdown: this.selectOwnerComponent() }); this.data.careMarkdown.__data__.name !== name; this.setData({ careMarkdown: this.data.careMarkdown.selectOwnerComponent() })) ;
      return this.data.careMarkdown;
    }, handleClick(t, e, a) {
      this.data.getCareMarkdown().triggerEvent("click", { event: t, node: a });
    } }, this.lifetimes = { created() {
      this.data.getCareMarkdown = this.getCareMarkdown.bind(this), this.data.handleClick = this.handleClick.bind(this);
    }, attached() {
    }, detached() {
    } };
  }
};
ChatMarkdownNode = (0, import_tslib.__decorate)([(0, import_src.wxComponent)()], ChatMarkdownNode);
var stdin_default = ChatMarkdownNode;
