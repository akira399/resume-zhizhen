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
  toComponent: () => toComponent,
  wxComponent: () => wxComponent
});
module.exports = __toCommonJS(stdin_exports);
var import_flatTool = require("./flatTool");
var import_validator = require("../validator");
var import_version = require("../version");
const RawLifeCycles = ["Created", "Attached", "Ready", "Moved", "Detached", "Error"], NativeLifeCycles = RawLifeCycles.map((e) => e.toLowerCase()), ComponentNativeProps = ["properties", "data", "observers", "methods", "behaviors", ...NativeLifeCycles, "relations", "externalClasses", "options", "lifetimes", "pageLifeTimes", "definitionFilter"];
const toComponent = function(e) {
  const { relations: t, behaviors: o = [], externalClasses: i = [] } = e;
  if (e.properties) {
    Object.keys(e.properties).forEach((t2) => {
      let o2 = e.properties[t2];
      (0, import_validator.isPlainObject)(o2) || (o2 = { type: o2 }), e.properties[t2] = o2;
    });
    [{ key: "ariaHidden", type: Boolean }, { key: "ariaRole", type: String }, { key: "ariaLabel", type: String }, { key: "ariaLabelledby", type: String }, { key: "ariaDescribedby", type: String }, { key: "ariaBusy", type: Boolean }].forEach(({ key: t2, type: o2 }) => {
      e.properties[t2] = { type: o2 };
    }), e.properties.style = { type: String, value: "" }, e.properties.customStyle = { type: String, value: "" };
  }
  e.methods || (e.methods = {}), e.lifetimes || (e.lifetimes = {});
  const s = {};
  if (t) {
    const e2 = (e3, t2) => Behavior({ created() {
      Object.defineProperty(this, `$${e3}`, { get: () => {
        const o2 = this.getRelationNodes(t2) || [];
        return "parent" === e3 ? o2[0] : o2;
      } });
    } }), i2 = {};
    Object.keys(t).forEach((o2) => {
      const s2 = t[o2], r = ["parent", "ancestor"].includes(s2.type) ? "parent" : "children", n = e2(r, o2);
      i2[r] = n;
    }), o.push(...Object.keys(i2).map((e3) => i2[e3]));
  }
  if (e.behaviors = [...o], e.externalClasses = ["class", ...i], Object.getOwnPropertyNames(e).forEach((t2) => {
    const o2 = Object.getOwnPropertyDescriptor(e, t2);
    o2 && (NativeLifeCycles.indexOf(t2) < 0 && "function" == typeof o2.value ? (Object.defineProperty(e.methods, t2, o2), delete e[t2]) : ComponentNativeProps.indexOf(t2) < 0 ? s[t2] = o2 : NativeLifeCycles.indexOf(t2) >= 0 && (e.lifetimes[t2] = e[t2]));
  }), Object.keys(s).length) {
    const t2 = e.lifetimes.created, o2 = e.lifetimes.attached, { controlledProps: i2 = [] } = e;
    e.lifetimes.created = function(...e2) {
      Object.defineProperties(this, s), t2 && t2.apply(this, e2);
    }, e.lifetimes.attached = function(...e2) {
      o2 && o2.apply(this, e2), i2.forEach(({ key: e3 }) => {
        const t3 = `default${e3.replace(/^(\w)/, (e4, t4) => t4.toUpperCase())}`, o3 = this.properties;
        null == o3[e3] && (this._selfControlled = true), null == o3[e3] && null != o3[t3] && this.setData({ [e3]: o3[t3] });
      });
    }, e.methods._trigger = function(e2, t3, o3) {
      const s2 = i2.find((t4) => t4.event === e2);
      if (s2) {
        const { key: e3 } = s2;
        this._selfControlled && this.setData({ [e3]: t3[e3] });
      }
      this.triggerEvent(e2, t3, o3);
    };
  }
  return e;
};
const wxComponent = function() {
  return function(e) {
    const t = new class extends e {
    }();
    t.options = t.options || {}, (0, import_version.canUseVirtualHost)() && (t.options.virtualHost = true);
    const o = toComponent((0, import_flatTool.toObject)(t));
    Component(o);
  };
};
