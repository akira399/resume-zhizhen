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
var import_src = require("../common/src/index");
var import_props = __toESM(require("./props"));
var import_config = __toESM(require("../common/config"));
var import_touch = __toESM(require("../mixins/touch"));
var import_utils = require("../common/utils");
var import_wechat = require("../common/wechat");
const { prefix } = import_config.default, name = `${prefix}-tabs`, getUniqueID = (0, import_utils.uniqueFactory)("tabs");
let Tabs = class extends import_src.SuperComponent {
  constructor() {
    super(...arguments), this.options = { pureDataPattern: /^currentLabels$/ }, this.behaviors = [import_touch.default], this.externalClasses = [`${prefix}-class`, `${prefix}-class-item`, `${prefix}-class-active`, `${prefix}-class-track`, `${prefix}-class-content`], this.relations = { "../tab-panel/tab-panel": { type: "descendant", linked(t) {
      this.children.push(t), this.initChildId(), t.index = this.children.length - 1, this.updateTabs();
    }, unlinked(t) {
      this.children = this.children.filter((e) => e.index !== t.index), this.updateTabs(() => this.setTrack()), this.initChildId();
    } } }, this.properties = import_props.default, this.controlledProps = [{ key: "value", event: "change" }], this.observers = { value(t) {
      t !== this.getCurrentName() && this.setCurrentIndexByName(t);
    } }, this.data = { prefix, classPrefix: name, tabs: [], currentLabels: [], currentIndex: -1, trackOption: { lineWidth: 0, distance: 0, isInit: true }, offset: 0, scrollLeft: 0, tabID: "", placement: "top" }, this.lifetimes = { created() {
      this.children = this.children || [];
    }, attached() {
      wx.nextTick(() => {
        this.setTrack();
      }), (0, import_utils.getRect)(this, `.${name}`).then((t) => {
        this.containerWidth = t.width;
      }), this.setData({ tabID: getUniqueID() });
    } }, this.methods = { onScroll(t) {
      const { scrollLeft: e } = t.detail;
      this.setData({ scrollLeft: e });
    }, updateTabs(t) {
      const { children: e } = this, i = e.map((t2) => t2.data);
      i.forEach((t2) => {
        "string" == typeof t2.icon && (t2.icon = { name: t2.icon });
      }), this.setData({ tabs: i }, t), this.setCurrentIndexByName(this.properties.value);
    }, setCurrentIndexByName(t) {
      const { children: e } = this, i = e.findIndex((e2) => e2.getComputedName() === `${t}`);
      i > -1 && this.setCurrentIndex(i);
    }, setCurrentIndex(t) {
      if (t <= -1 || t >= this.children.length) return;
      const e = [];
      this.children.forEach((i2, s2) => {
        const r = t === s2;
        r === i2.data.active && i2.initialized || i2.render(r, this), this.data.animation && s2 <= t && !i2.data.hasActivated && i2.setData({ hasActivated: true }), e.push(i2.data.label);
      });
      const { currentIndex: i, currentLabels: s } = this.data;
      i === t && s.join("") === e.join("") || this.setData({ currentIndex: t, currentLabels: e }, () => {
        this.setTrack();
      });
    }, getCurrentName() {
      if (this.children) {
        const t = this.children[this.data.currentIndex];
        if (t) return t.getComputedName();
      }
    }, calcScrollOffset: (t, e, i, s) => s + e - 0.5 * t + i / 2, getTabHeight() {
      return (0, import_utils.getRect)(this, `.${name}`);
    }, getTrackSize() {
      const { bottomLineMode: t } = this.properties, e = { fixed: `.${prefix}-tabs__track`, auto: `.${prefix}-tabs__item--active .${prefix}-tabs__item-inner`, full: `.${prefix}-tabs__item--active` };
      return new Promise((i, s) => {
        this.trackWidth ? i(this.trackWidth) : (0, import_utils.getRect)(this, e[t] || e.fixed).then((t2) => {
          t2 && i(t2.width);
        }).catch(s);
      });
    }, setTrack() {
      return (0, import_tslib.__awaiter)(this, void 0, void 0, function* () {
        const { children: t } = this;
        if (!t) return;
        const { currentIndex: e } = this.data;
        if (!(e <= -1)) try {
          const t2 = yield (0, import_utils.getRect)(this, `.${prefix}-tabs__item`, true), i = t2[e];
          if (!i) return;
          let s = 0, r = 0, a = 0;
          if (t2.forEach((t3) => {
            s < e && (r += t3.width, s += 1), a += t3.width;
          }), this.containerWidth) {
            const t3 = this.calcScrollOffset(this.containerWidth, i.left, i.width, this.data.scrollLeft), e2 = a - this.containerWidth;
            this.setData({ offset: Math.min(Math.max(t3, 0), e2) });
          } else this._hasObserved || (this._hasObserved = true, (0, import_wechat.getObserver)(this, `.${name}`).then(() => this.setTrack()));
          const n = yield this.getTrackSize();
          "line" === this.data.theme && (r += (i.width - n) / 2);
          const h = void 0 === this.previousIndex;
          (h || this.previousIndex !== e) && (this.previousIndex = e, this.setData({ trackOption: { lineWidth: n, distance: r, isInit: h } }));
        } catch (t2) {
          this.triggerEvent("error", t2);
        }
      });
    }, onTabTap(t) {
      const { index: e } = t.currentTarget.dataset;
      this.changeIndex(e);
    }, onTouchStart(t) {
      this.properties.swipeable && this.touchStart(t);
    }, onTouchMove(t) {
      this.properties.swipeable && this.touchMove(t);
    }, onTouchEnd() {
      if (!this.properties.swipeable) return;
      const { direction: t, deltaX: e, offsetX: i } = this;
      if ("horizontal" === t && i >= 50) {
        const t2 = this.getAvailableTabIndex(e);
        -1 !== t2 && this.changeIndex(t2);
      }
    }, onTouchScroll(t) {
      this._trigger("scroll", t.detail);
    }, changeIndex(t) {
      const e = this.data.tabs[t], { value: i, label: s } = e;
      (null == e ? void 0 : e.disabled) || t === this.data.currentIndex || this._trigger("change", { value: i, label: s }), this._trigger("click", { value: i, label: s });
    }, getAvailableTabIndex(t) {
      const e = t > 0 ? -1 : 1, { currentIndex: i, tabs: s } = this.data, r = s.length;
      for (let t2 = e; i + e >= 0 && i + e < r; t2 += e) {
        const e2 = i + t2;
        if (!(e2 >= 0 && e2 < r && s[e2])) return i;
        if (!s[e2].disabled) return e2;
      }
      return -1;
    } };
  }
  initChildId() {
    this.children.forEach((t, e) => {
      t.setId(`${this.data.tabID}_panel_${e}`);
    });
  }
};
Tabs = (0, import_tslib.__decorate)([(0, import_src.wxComponent)()], Tabs);
var stdin_default = Tabs;
