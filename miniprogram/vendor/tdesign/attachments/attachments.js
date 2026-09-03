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
  default: () => stdin_default
});
module.exports = __toCommonJS(stdin_exports);
var import_tslib = require("../tslib/tslib.js");
var import_src = require("../common/src/index");
var import_config = __toESM(require("../common/config"));
var import_props = __toESM(require("./props"));
var import_using_config = __toESM(require("../mixins/using-config"));
const { prefix } = import_config.default, componentName = "attachments";
let Attachments = class extends import_src.SuperComponent {
  constructor() {
    super(...arguments), this.behaviors = [(0, import_using_config.default)({ componentName: "attachments" })], this.options = { multipleSlots: true }, this.properties = Object.assign(Object.assign({}, import_props.default), { inChat: { type: Boolean, value: false } }), this.data = { classPrefix: `${prefix}-attachments`, files: [] }, this.observers = { items() {
      this.setFiles();
    } }, this.methods = { onFileWrapTap(e) {
      var i;
      const { index: t } = e.currentTarget.dataset || {}, o = null === (i = this.data.files) || void 0 === i ? void 0 : i[t];
      o && this.handleFileClick(o);
    }, onRemoveTap(e) {
      var i;
      const { index: t } = e.currentTarget.dataset || {}, o = null === (i = this.data.files) || void 0 === i ? void 0 : i[t];
      "function" == typeof (null == e ? void 0 : e.stopPropagation) && e.stopPropagation(), void 0 !== o && this.handleRemove(o, t);
    }, handleFileClick(e) {
      this.data.imageViewer && "image" === e.fileType && wx.previewImage({ urls: [e.url] }), this.triggerEvent("fileClick", { item: e });
    }, handleRemove(e, i) {
      this.triggerEvent("remove", { item: e, index: i });
    }, renderDesc(e) {
      const i = e.size || 0;
      let t, o;
      if (i < 1024) t = i, o = "B";
      else if (i < 1048576) {
        const e2 = i / 1024;
        t = e2 % 1 == 0 ? e2 : e2.toFixed(2), o = "KB";
      } else {
        const e2 = i / 1048576;
        t = e2 % 1 == 0 ? e2 : e2.toFixed(2), o = "MB";
      }
      return `${t} ${o}`;
    }, renderIcon(e) {
      const i = { file: { name: "file-zip-filled", color: "#E37318" }, video: { name: "video-filled", color: "#D54941" }, pdf: { name: "file-pdf-filled", color: "#D54941" }, doc: { name: "file-word-filled", color: "#0052d9" }, excel: { name: "file-excel-filled", color: "#2BA471" }, ppt: { name: "file-powerpoint-filled", color: "#E37318" }, audio: { name: "video-filled", color: "#D54941" } };
      return i[e.fileType] || i.file;
    }, renderFileType(e) {
      if (e.fileType) return e.fileType;
      if (["image", "video", "audio", "pdf", "doc", "ppt", "txt", "excel"].includes(e.type)) return e.fileType;
      const i = e.url || "", t = i.lastIndexOf(".");
      return { jpg: "image", jpeg: "image", png: "image", gif: "image", bmp: "image", webp: "image", mp4: "video", mov: "video", avi: "video", mkv: "video", webm: "video", mp3: "audio", wav: "audio", ogg: "audio", aac: "audio", pdf: "pdf", doc: "doc", docx: "doc", ppt: "ppt", pptx: "ppt", xls: "excel", xlsx: "excel", txt: "txt" }[-1 !== t ? i.substring(t + 1).toLowerCase() : ""] || "";
    }, renderExtension(e) {
      if (e.extension) return e.extension;
      return e.extension || (e.url ? e.url.split(".").pop().toLowerCase() : "");
    }, setFiles() {
      this.setData({ files: this.properties.items.map((e) => Object.assign(Object.assign({}, e), { fileType: this.data.renderFileType(e), desc: this.data.renderDesc(e), fileIcon: this.data.renderIcon(e) })) });
    } }, this.lifetimes = { created() {
      this.data.handleFileClick = this.handleFileClick.bind(this), this.data.handleRemove = this.handleRemove.bind(this), this.data.renderDesc = this.renderDesc.bind(this), this.data.renderIcon = this.renderIcon.bind(this), this.data.renderFileType = this.renderFileType.bind(this), this.data.renderExtension = this.renderExtension.bind(this);
    }, attached() {
      this.setFiles();
    }, detached() {
    } };
  }
};
Attachments = (0, import_tslib.__decorate)([(0, import_src.wxComponent)()], Attachments);
var stdin_default = Attachments;
