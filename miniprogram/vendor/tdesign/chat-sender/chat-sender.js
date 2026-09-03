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
const { prefix } = import_config.default, componentName = "chat-sender";
let ChatSender = class extends import_src.SuperComponent {
  constructor() {
    super(...arguments), this.behaviors = [(0, import_using_config.default)({ componentName: "chat-sender" })], this.options = { multipleSlots: true }, this.properties = import_props.default, this.data = { classPrefix: `${prefix}-chat-sender`, scrollViewTop: 0, focusFlag: false, isSending: false, inputStyle: "", originalMarginBottom: 12, files: [], uploadPlacement: "bottom", uploadConfig: { uploadCamera: { iconClass: "camera", text: "\u62CD\u6444", handler: "handleImageUpload", handlerArg: "camera" }, uploadImage: { iconClass: "image", text: "\u56FE\u7247", handler: "handleImageUpload", handlerArg: "album" }, uploadAttachment: { iconClass: "file-add", text: "\u6587\u4EF6", handler: "handleWechatFileUpload", handlerArg: "attachment" } }, uploadNames: [], inputMode: "keyboard" }, this.observers = { fileList(e) {
      this.setData({ files: e ? JSON.parse(JSON.stringify(e)) : [] });
    }, renderPresets(e) {
      const t = e.find((e2) => Array.isArray(e2.presets));
      this.setData({ uploadNames: t ? t.presets : [] });
    } }, this.methods = { handleSpeechToggle() {
      wx.hideKeyboard && wx.hideKeyboard(), this.setData({ inputMode: "keyboard" === this.data.inputMode ? "speech" : "keyboard" });
    }, onkeyboardheightchange(e) {
      if (this.triggerEvent("keyboardheightchange", e.detail), !this.data.autoRiseWithKeyboard) return;
      const t = e.detail.height;
      if (t > 0) {
        const e2 = t + this.data.originalMarginBottom;
        this.setData({ inputStyle: `margin-bottom: ${e2}px;` });
      } else this.setData({ inputStyle: "" });
    }, handleSendClick(e) {
      this.data.loading ? this.handleStop(e) : this.sendClick(e);
    }, handleOutsideClick() {
      this.triggerEvent("updatevisible", false);
    }, sendClick(e) {
      this.data.value && !this.data.disabled && this.triggerEvent("send", { value: this.data.value, e });
    }, handleStop(e) {
      this.triggerEvent("stop", { value: this.data.value, e }, { bubbles: false });
    }, handlerClick() {
      this.data.disabled ? this.setData({ focusFlag: false }) : this.setData({ focusFlag: true });
    }, focusFn(e) {
      this.setData({ focusFlag: true }), this.triggerEvent("focus", { value: e.detail.value, context: e });
    }, blurFn(e) {
      this.setData({ focusFlag: false }), this.triggerEvent("blur", { value: e.detail.value, context: e });
    }, textChange(e) {
      this.setData({ value: e.detail.value }), this.triggerEvent("change", { value: e.detail.value, context: e });
    }, handleUploadClick(e) {
      const { status: t } = e.currentTarget.dataset;
      this.triggerEvent("uploadClick"), this.data.disabled || "disabled" === t || this.triggerEvent("updateVisible", !this.data.visible);
    }, handleFileClick(e) {
      const { item: t } = e.detail;
      this.triggerEvent("fileClick", { file: t });
    }, handleFileRemove(e) {
      if (!Array.isArray(this.data.files)) return;
      const { item: t, index: i } = e.detail;
      this.triggerEvent("fileDelete", { file: t });
      const a = [...this.data.files];
      a.splice(i, 1), this.setData({ files: a }), this.triggerEvent("fileChange", { files: a });
    }, handleImageUpload(e) {
      return (0, import_tslib.__awaiter)(this, void 0, void 0, function* () {
        const { type: t } = e.currentTarget.dataset, i = [t];
        try {
          const a = yield wx.chooseImage({ count: 1, sizeType: ["original", "compressed"], sourceType: i });
          if (a.tempFilePaths && a.tempFilePaths.length > 0) {
            const i2 = a.tempFilePaths.map((e2) => ({ url: e2, name: e2, size: 0, fileType: "image" })), s = "album" === t ? "uploadImage" : "uploadCamera";
            this.triggerEvent("fileSelect", { e, name: s, files: i2 });
            const l = [...this.data.files, ...i2];
            this.setData({ files: l }), this.triggerEvent("fileChange", { files: l });
          }
        } catch (e2) {
          wx.showToast({ title: "album" === t ? "\u9009\u62E9\u56FE\u7247\u5931\u8D25" : "\u62CD\u7167\u5931\u8D25", icon: "none" });
        } finally {
          this.triggerEvent("updatevisible", false);
        }
      });
    }, handleWechatFileUpload(e) {
      return (0, import_tslib.__awaiter)(this, void 0, void 0, function* () {
        try {
          const t = yield wx.chooseMessageFile({ count: 5, type: "all" });
          if (t.tempFiles && t.tempFiles.length > 0) {
            const i = t.tempFiles.map((e2) => Object.assign(Object.assign({}, e2), { url: e2.path })), a = [...this.data.files, ...i];
            this.setData({ files: a }), this.triggerEvent("fileSelect", { e, name: "uploadAttachment", files: i }), this.triggerEvent("fileChange", { files: a });
          }
        } catch (e2) {
          wx.showToast({ title: "\u9009\u62E9\u5FAE\u4FE1\u6587\u4EF6\u5931\u8D25", icon: "none" });
        } finally {
          this.triggerEvent("updatevisible", false);
        }
      });
    }, handleUploadEntryClick(e) {
      const { name: t } = e.currentTarget.dataset, i = this.data.uploadConfig[t];
      i && this[i.handler] && this[i.handler]({ currentTarget: { dataset: { type: i.handlerArg } } });
    } }, this.lifetimes = { created() {
      this.data.onkeyboardheightchange = this.onkeyboardheightchange.bind(this), this.data.handleSendClick = this.handleSendClick.bind(this), this.data.handleOutsideClick = this.handleOutsideClick.bind(this), this.data.sendClick = this.sendClick.bind(this), this.data.handleStop = this.handleStop.bind(this), this.data.handlerClick = this.handlerClick.bind(this), this.data.focusFn = this.focusFn.bind(this), this.data.blurFn = this.blurFn.bind(this), this.data.textChange = this.textChange.bind(this), this.data.handleUploadClick = this.handleUploadClick.bind(this), this.data.handleFileClick = this.handleFileClick.bind(this), this.data.handleFileRemove = this.handleFileRemove.bind(this), this.data.handleImageUpload = this.handleImageUpload.bind(this), this.data.handleWechatFileUpload = this.handleWechatFileUpload.bind(this), this.data.handleUploadEntryClick = this.handleUploadEntryClick.bind(this), this.data.handleSpeechToggle = this.handleSpeechToggle.bind(this);
    }, attached() {
    }, detached() {
    } };
  }
};
ChatSender = (0, import_tslib.__decorate)([(0, import_src.wxComponent)()], ChatSender);
var stdin_default = ChatSender;
