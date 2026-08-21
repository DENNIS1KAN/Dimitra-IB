/* @ds-bundle: {"format":4,"namespace":"LumenDesignSystem_44a90c","components":[{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"FilterPill","sourcePath":"components/actions/FilterPill.jsx"},{"name":"IconButton","sourcePath":"components/actions/IconButton.jsx"},{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"ListRow","sourcePath":"components/core/ListRow.jsx"},{"name":"Wordmark","sourcePath":"components/core/Wordmark.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"TextArea","sourcePath":"components/forms/TextArea.jsx"},{"name":"LessonRow","sourcePath":"components/learning/LessonRow.jsx"},{"name":"LockPanel","sourcePath":"components/learning/LockPanel.jsx"},{"name":"ModuleCard","sourcePath":"components/learning/ModuleCard.jsx"},{"name":"NoteCard","sourcePath":"components/learning/NoteCard.jsx"},{"name":"ProgressBar","sourcePath":"components/learning/ProgressBar.jsx"},{"name":"SessionCard","sourcePath":"components/learning/SessionCard.jsx"},{"name":"TabBar","sourcePath":"components/navigation/TabBar.jsx"},{"name":"TopBar","sourcePath":"components/navigation/TopBar.jsx"}],"sourceHashes":{"components/actions/Button.jsx":"7d942ff0a264","components/actions/FilterPill.jsx":"2dee4aa4905e","components/actions/IconButton.jsx":"6912309c11ce","components/core/Avatar.jsx":"4fcb7305cb0d","components/core/Badge.jsx":"a5d48e122375","components/core/Card.jsx":"98d63eb912c1","components/core/Icon.jsx":"6727415f407d","components/core/ListRow.jsx":"fd22023ab5d5","components/core/Wordmark.jsx":"55ad5a4a42e5","components/feedback/Toast.jsx":"70b6f3b885bc","components/forms/Input.jsx":"156ab1334c62","components/forms/TextArea.jsx":"0def29f068d9","components/learning/LessonRow.jsx":"59bb3a743766","components/learning/LockPanel.jsx":"27a9fe0d0653","components/learning/ModuleCard.jsx":"1adfa7ab7731","components/learning/NoteCard.jsx":"777f0dff139d","components/learning/ProgressBar.jsx":"d2f82fa9bd5e","components/learning/SessionCard.jsx":"cd0101998caa","components/navigation/TabBar.jsx":"abfd2200e8b5","components/navigation/TopBar.jsx":"d04092483c2a","ui_kits/app/AboutScreen.jsx":"f1bc7f6dbe2e","ui_kits/app/ClinicsScreen.jsx":"dad705f693b8","ui_kits/app/HomeScreen.jsx":"ba8923dfe8bd","ui_kits/app/ModuleScreen.jsx":"29d00f549506","ui_kits/app/ModulesScreen.jsx":"a45893b2d9b8","ui_kits/app/ProgressScreen.jsx":"c90def3a4299","ui_kits/app/WelcomeScreen.jsx":"2480767bfeb1","ui_kits/web/DesktopAbout.jsx":"1d62035b3cdc","ui_kits/web/DesktopHome.jsx":"b950e7e9f27a","ui_kits/web/DesktopModules.jsx":"63713084bd07"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.LumenDesignSystem_44a90c = window.LumenDesignSystem_44a90c || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/actions/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const css = `.lmn-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--font-sans);font-weight:var(--font-weight-bold);border-radius:var(--radius-buttons);border:1px solid transparent;cursor:pointer;letter-spacing:-0.16px;line-height:1.2;transition:filter .15s ease,transform .1s ease,opacity .15s ease;text-decoration:none;white-space:nowrap}
.lmn-btn:hover{filter:brightness(.96)}
.lmn-btn:active{transform:translateY(1px)}
.lmn-btn-primary{background:var(--action-primary);color:var(--text-inverse)}
.lmn-btn-dark{background:var(--action-dark);color:var(--text-inverse);box-shadow:var(--shadow-subtle)}
.lmn-btn-dark:active{box-shadow:none}
.lmn-btn-secondary{background:var(--surface-card);color:var(--text-primary);border-color:var(--border-card)}
.lmn-btn-secondary:hover{filter:none;background:var(--color-page-cream)}
.lmn-btn-ghost{background:transparent;color:var(--text-primary);font-weight:var(--font-weight-medium)}
.lmn-btn-ghost:hover{filter:none;opacity:.7}
.lmn-btn[disabled]{background:var(--color-linen);color:var(--text-disabled);cursor:not-allowed;box-shadow:none;filter:none;transform:none}`;
function ensureCss() {
  if (typeof document !== 'undefined' && !document.getElementById('lmn-btn-css')) {
    const s = document.createElement('style');
    s.id = 'lmn-btn-css';
    s.textContent = css;
    document.head.appendChild(s);
  }
}
const sizes = {
  sm: {
    fontSize: '14px',
    padding: '8px 16px'
  },
  md: {
    fontSize: '16px',
    padding: '12px 24px'
  },
  lg: {
    fontSize: '16px',
    padding: '14px 28px'
  }
};
function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  children,
  style,
  ...rest
}) {
  ensureCss();
  return /*#__PURE__*/React.createElement("button", _extends({
    className: `lmn-btn lmn-btn-${variant}`,
    disabled: disabled,
    style: {
      ...sizes[size],
      ...(fullWidth ? {
        width: '100%'
      } : {}),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/actions/FilterPill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const css = `.lmn-pill{display:inline-flex;align-items:center;gap:8px;border-radius:var(--radius-pills);padding:12px 20px;font-family:var(--font-sans);font-size:var(--text-body-sm);font-weight:var(--font-weight-medium);letter-spacing:var(--tracking-body-sm);cursor:pointer;border:1px solid var(--border-card);background:var(--surface-card);color:var(--text-primary);transition:background .15s ease}
.lmn-pill:hover{background:var(--color-page-cream)}
.lmn-pill-active{background:var(--action-dark);color:var(--text-inverse);border-color:var(--action-dark)}
.lmn-pill-active:hover{background:var(--action-dark)}
.lmn-pill-dot{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.9}`;
function ensureCss() {
  if (typeof document !== 'undefined' && !document.getElementById('lmn-pill-css')) {
    const s = document.createElement('style');
    s.id = 'lmn-pill-css';
    s.textContent = css;
    document.head.appendChild(s);
  }
}
function FilterPill({
  active = false,
  children,
  style,
  ...rest
}) {
  ensureCss();
  return /*#__PURE__*/React.createElement("button", _extends({
    className: `lmn-pill${active ? ' lmn-pill-active' : ''}`,
    style: style
  }, rest), active && /*#__PURE__*/React.createElement("span", {
    className: "lmn-pill-dot"
  }), children);
}
Object.assign(__ds_scope, { FilterPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/FilterPill.jsx", error: String((e && e.message) || e) }); }

// components/actions/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const css = `.lmn-iconbtn{display:inline-flex;align-items:center;justify-content:center;border-radius:var(--radius-pills);cursor:pointer;border:1px solid transparent;background:transparent;color:var(--text-secondary);transition:background .15s ease;font-family:var(--font-sans)}
.lmn-iconbtn:hover{background:rgba(45,44,43,.06)}
.lmn-iconbtn:active{transform:translateY(1px)}
.lmn-iconbtn-outline{background:var(--surface-card);border-color:var(--border-card);color:var(--text-primary)}
.lmn-iconbtn-dark{background:var(--action-dark);color:var(--text-inverse)}
.lmn-iconbtn-dark:hover{background:var(--color-soft-black)}`;
function ensureCss() {
  if (typeof document !== 'undefined' && !document.getElementById('lmn-iconbtn-css')) {
    const s = document.createElement('style');
    s.id = 'lmn-iconbtn-css';
    s.textContent = css;
    document.head.appendChild(s);
  }
}
const sizes = {
  sm: 32,
  md: 40,
  lg: 48
};
function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  label,
  style,
  ...rest
}) {
  ensureCss();
  const px = sizes[size];
  return /*#__PURE__*/React.createElement("button", _extends({
    className: `lmn-iconbtn lmn-iconbtn-${variant}`,
    "aria-label": label || icon,
    style: {
      width: px,
      height: px,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-rounded",
    style: {
      fontSize: Math.round(px * .55),
      fontVariationSettings: "'FILL' 1,'wght' 500"
    }
  }, icon));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const sizes = {
  sm: 28,
  md: 36,
  lg: 48,
  xl: 72
};
function Avatar({
  initials = 'DA',
  size = 'md',
  src,
  tone = 'indigo',
  style,
  ...rest
}) {
  const px = sizes[size] || size;
  const bg = tone === 'indigo' ? 'var(--accent-dimitra)' : tone === 'yellow' ? 'var(--color-sunbeam-yellow)' : 'var(--color-linen)';
  const fg = tone === 'yellow' ? 'var(--text-on-yellow)' : tone === 'indigo' ? 'var(--text-inverse)' : 'var(--text-secondary)';
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      width: px,
      height: px,
      borderRadius: 'var(--radius-pills)',
      background: bg,
      color: fg,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-sans)',
      fontWeight: 700,
      fontSize: Math.round(px * .38),
      letterSpacing: '-0.02em',
      overflow: 'hidden',
      flexShrink: 0,
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: initials,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initials);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const tones = {
  neutral: {
    background: 'var(--color-page-cream)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-card)'
  },
  new: {
    background: 'var(--color-sunbeam-yellow)',
    color: 'var(--text-on-yellow)',
    border: '1px solid transparent'
  },
  done: {
    background: 'rgba(0,97,239,.08)',
    color: 'var(--action-primary)',
    border: '1px solid transparent'
  },
  locked: {
    background: 'var(--color-linen)',
    color: 'var(--text-tertiary)',
    border: '1px solid transparent'
  },
  live: {
    background: 'var(--color-deep-indigo)',
    color: 'var(--text-inverse)',
    border: '1px solid transparent'
  }
};
function Badge({
  tone = 'neutral',
  icon,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      borderRadius: 'var(--radius-pills)',
      padding: '4px 10px',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-caption)',
      fontWeight: 500,
      letterSpacing: 'var(--tracking-caption)',
      lineHeight: 1.4,
      ...tones[tone],
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-rounded",
    style: {
      fontSize: 13,
      fontVariationSettings: "'FILL' 1,'wght' 500"
    }
  }, icon), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const surfaces = {
  white: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-card)',
    color: 'var(--text-primary)'
  },
  cream: {
    background: 'var(--surface-page)',
    border: 'none',
    color: 'var(--text-primary)'
  },
  yellow: {
    background: 'var(--surface-accent)',
    border: 'none',
    color: 'var(--text-on-yellow)'
  },
  indigo: {
    background: 'var(--surface-contemplative)',
    border: 'none',
    color: 'var(--text-inverse)'
  }
};
function Card({
  surface = 'white',
  featured = false,
  padding,
  style,
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      borderRadius: featured ? 'var(--radius-featured)' : 'var(--radius-cards)',
      padding: padding ?? (featured ? '32px' : '20px'),
      boxShadow: surface === 'white' ? 'var(--shadow-card)' : 'none',
      boxSizing: 'border-box',
      ...surfaces[surface],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Icon({
  name,
  size = 20,
  color,
  filled = true,
  weight = 500,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: "material-symbols-rounded",
    "aria-hidden": "true",
    style: {
      fontSize: size,
      color: color || 'inherit',
      fontVariationSettings: `'FILL' ${filled ? 1 : 0},'wght' ${weight}`,
      lineHeight: 1,
      verticalAlign: 'middle',
      ...style
    }
  }, rest), name);
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/ListRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const css = `.lmn-listrow{display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;background:var(--surface-card);border:1px solid var(--border-card);border-radius:var(--radius-cards);padding:16px 20px;font-family:var(--font-sans);cursor:pointer;transition:background .15s ease;text-align:left}
.lmn-listrow:hover{background:#fdfbfa}
.lmn-listrow:active{transform:translateY(1px)}`;
function ensureCss() {
  if (typeof document !== 'undefined' && !document.getElementById('lmn-listrow-css')) {
    const s = document.createElement('style');
    s.id = 'lmn-listrow-css';
    s.textContent = css;
    document.head.appendChild(s);
  }
}
function ListRow({
  icon,
  iconColor = 'var(--action-primary)',
  label,
  meta,
  trailing,
  chevron = true,
  style,
  ...rest
}) {
  ensureCss();
  return /*#__PURE__*/React.createElement("button", _extends({
    className: "lmn-listrow",
    style: style
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 22,
    color: iconColor
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 'var(--text-body)',
      fontWeight: 500,
      letterSpacing: 'var(--tracking-body)',
      color: 'var(--text-primary)'
    }
  }, label), meta && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 'var(--text-caption)',
      letterSpacing: 'var(--tracking-caption)',
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, meta)), trailing, chevron && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron_right",
    size: 20,
    color: "var(--text-secondary)"
  }));
}
Object.assign(__ds_scope, { ListRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/ListRow.jsx", error: String((e && e.message) || e) }); }

// components/core/Wordmark.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const sizes = {
  sm: {
    fs: 22,
    ls: -0.66,
    by: 11
  },
  md: {
    fs: 28,
    ls: -0.84,
    by: 13
  },
  lg: {
    fs: 44,
    ls: -1.32,
    by: 16
  },
  xl: {
    fs: 88,
    ls: -2.64,
    by: 20
  }
};
function Wordmark({
  size = 'md',
  byline = false,
  inverse = false,
  style,
  ...rest
}) {
  const s = sizes[size];
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: byline ? 'flex-start' : 'center',
      fontFamily: 'var(--font-sans)',
      lineHeight: 1,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: s.fs,
      letterSpacing: s.ls,
      color: inverse ? 'var(--text-inverse)' : 'var(--text-primary)'
    }
  }, "lumen", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent-punctuation)'
    }
  }, ".")), byline && /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500,
      fontSize: s.by,
      letterSpacing: '-0.02em',
      color: inverse ? 'rgba(255,255,255,.75)' : 'var(--text-secondary)',
      marginTop: Math.round(s.by * .55)
    }
  }, "by Dimitra Anglou"));
}
Object.assign(__ds_scope, { Wordmark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Wordmark.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Toast({
  icon = 'check',
  message,
  detail,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-cards)',
      padding: '14px 18px',
      boxShadow: 'var(--shadow-float)',
      fontFamily: 'var(--font-sans)',
      maxWidth: 360,
      boxSizing: 'border-box',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 'var(--radius-pills)',
      background: 'var(--action-primary)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18,
    color: "#fff"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 'var(--text-body-sm)',
      fontWeight: 700,
      letterSpacing: 'var(--tracking-body-sm)',
      color: 'var(--text-primary)'
    }
  }, message), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 'var(--text-caption)',
      letterSpacing: 'var(--tracking-caption)',
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, detail)));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const css = `.lmn-field{display:flex;flex-direction:column;gap:8px;font-family:var(--font-sans)}
.lmn-field-label{font-size:var(--text-body-sm);font-weight:var(--font-weight-medium);letter-spacing:var(--tracking-body-sm);color:var(--text-primary)}
.lmn-input{font-family:var(--font-sans);font-size:var(--text-body);letter-spacing:var(--tracking-body);color:var(--text-primary);background:var(--surface-card);border:1px solid var(--border-input);border-radius:var(--radius-inputs);padding:12px 16px;outline:none;transition:border-color .15s ease,box-shadow .15s ease;width:100%;box-sizing:border-box}
.lmn-input::placeholder{color:var(--text-disabled)}
.lmn-input:focus{border-color:var(--action-primary);box-shadow:0 0 0 3px rgba(0,97,239,.12)}
.lmn-field-help{font-size:var(--text-caption);color:var(--text-tertiary);letter-spacing:var(--tracking-caption)}
.lmn-field-error .lmn-input{border-color:#c4320a}
.lmn-field-error .lmn-field-help{color:#c4320a}`;
function ensureCss() {
  if (typeof document !== 'undefined' && !document.getElementById('lmn-input-css')) {
    const s = document.createElement('style');
    s.id = 'lmn-input-css';
    s.textContent = css;
    document.head.appendChild(s);
  }
}
function Input({
  label,
  helper,
  error = false,
  style,
  ...rest
}) {
  ensureCss();
  return /*#__PURE__*/React.createElement("label", {
    className: `lmn-field${error ? ' lmn-field-error' : ''}`,
    style: style
  }, label && /*#__PURE__*/React.createElement("span", {
    className: "lmn-field-label"
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    className: "lmn-input"
  }, rest)), helper && /*#__PURE__*/React.createElement("span", {
    className: "lmn-field-help"
  }, helper));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextArea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const css = `.lmn-textarea{font-family:var(--font-sans);font-size:var(--text-body);letter-spacing:var(--tracking-body);line-height:var(--leading-body);color:var(--text-primary);background:var(--surface-card);border:1px solid var(--border-input);border-radius:var(--radius-xl);padding:14px 16px;outline:none;transition:border-color .15s ease,box-shadow .15s ease;width:100%;box-sizing:border-box;resize:vertical;min-height:96px}
.lmn-textarea::placeholder{color:var(--text-disabled)}
.lmn-textarea:focus{border-color:var(--action-primary);box-shadow:0 0 0 3px rgba(0,97,239,.12)}`;
function ensureCss() {
  if (typeof document !== 'undefined' && !document.getElementById('lmn-textarea-css')) {
    const s = document.createElement('style');
    s.id = 'lmn-textarea-css';
    s.textContent = css;
    document.head.appendChild(s);
  }
}
function TextArea({
  label,
  style,
  ...rest
}) {
  ensureCss();
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      fontWeight: 500,
      letterSpacing: 'var(--tracking-body-sm)'
    }
  }, label), /*#__PURE__*/React.createElement("textarea", _extends({
    className: "lmn-textarea"
  }, rest)));
}
Object.assign(__ds_scope, { TextArea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextArea.jsx", error: String((e && e.message) || e) }); }

// components/learning/LessonRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const kinds = {
  video: {
    icon: 'play_circle',
    color: 'var(--action-primary)'
  },
  slides: {
    icon: 'description',
    color: 'var(--color-plum)'
  },
  exercise: {
    icon: 'edit_note',
    color: 'var(--color-graphite)'
  },
  solutions: {
    icon: 'lock_open',
    color: 'var(--color-deep-indigo)'
  }
};
const css = `.lmn-lessonrow{display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;background:var(--surface-card);border:1px solid var(--border-card);border-radius:var(--radius-cards);padding:14px 16px;font-family:var(--font-sans);cursor:pointer;transition:background .15s ease;text-align:left}
.lmn-lessonrow:hover{background:#fdfbfa}
.lmn-lessonrow:active{transform:translateY(1px)}
.lmn-lessonrow[data-done="true"]{opacity:.72}`;
function ensureCss() {
  if (typeof document !== 'undefined' && !document.getElementById('lmn-lessonrow-css')) {
    const s = document.createElement('style');
    s.id = 'lmn-lessonrow-css';
    s.textContent = css;
    document.head.appendChild(s);
  }
}
function LessonRow({
  kind = 'video',
  title,
  duration,
  done = false,
  locked = false,
  style,
  ...rest
}) {
  ensureCss();
  const k = kinds[kind] || kinds.video;
  return /*#__PURE__*/React.createElement("button", _extends({
    className: "lmn-lessonrow",
    "data-done": done,
    style: style
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: locked ? 'lock' : k.icon,
    size: 22,
    color: locked ? 'var(--state-locked)' : k.color
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 'var(--text-body)',
      fontWeight: 500,
      letterSpacing: 'var(--tracking-body)',
      color: locked ? 'var(--text-tertiary)' : 'var(--text-primary)',
      textDecoration: done ? 'line-through' : 'none',
      textDecorationThickness: '1px'
    }
  }, title), duration && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 'var(--text-caption)',
      letterSpacing: 'var(--tracking-caption)',
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, duration)), done ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "done",
    icon: "check"
  }, "Done") : locked ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "locked",
    icon: "lock"
  }, "Locked") : /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron_right",
    size: 20,
    color: "var(--text-secondary)"
  }));
}
Object.assign(__ds_scope, { LessonRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/learning/LessonRow.jsx", error: String((e && e.message) || e) }); }

// components/learning/LockPanel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function LockPanel({
  locked = true,
  title,
  body,
  cta,
  onAction,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: locked ? 'var(--surface-page)' : 'var(--surface-contemplative)',
      border: locked ? '1px dashed var(--border-divider)' : 'none',
      borderRadius: 'var(--radius-featured)',
      padding: '24px',
      fontFamily: 'var(--font-sans)',
      textAlign: 'center',
      color: locked ? 'var(--text-secondary)' : 'var(--text-inverse)',
      boxSizing: 'border-box',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: locked ? 'lock' : 'lock_open',
    size: 28,
    color: locked ? 'var(--state-locked)' : 'var(--color-sunbeam-yellow)'
  }), /*#__PURE__*/React.createElement("h4", {
    style: {
      margin: '10px 0 6px',
      fontSize: 'var(--text-subheading)',
      fontWeight: 700,
      letterSpacing: 'var(--tracking-subheading)',
      color: locked ? 'var(--text-primary)' : 'var(--text-inverse)'
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 auto',
      maxWidth: 400,
      fontSize: 'var(--text-body-sm)',
      lineHeight: 1.5,
      letterSpacing: 'var(--tracking-body-sm)',
      opacity: locked ? 1 : .85
    }
  }, body), cta && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: locked ? 'dark' : 'primary',
    onClick: onAction
  }, cta)));
}
Object.assign(__ds_scope, { LockPanel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/learning/LockPanel.jsx", error: String((e && e.message) || e) }); }

// components/learning/NoteCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function NoteCard({
  note,
  date,
  signature = '— Dimitra',
  compact = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface-accent)',
      borderRadius: 'var(--radius-featured)',
      padding: compact ? '20px' : '24px',
      fontFamily: 'var(--font-sans)',
      color: 'var(--text-on-yellow)',
      boxSizing: 'border-box',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    size: "sm"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      fontWeight: 700,
      letterSpacing: 'var(--tracking-body-sm)'
    }
  }, "This week from Dimitra"), date && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontSize: 'var(--text-caption)',
      fontWeight: 500,
      opacity: .7
    }
  }, date)), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: compact ? 'var(--text-body-sm)' : 'var(--text-body)',
      lineHeight: 1.5,
      letterSpacing: 'var(--tracking-body)',
      fontWeight: 400
    }
  }, note), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      fontSize: 'var(--text-body-sm)',
      fontWeight: 500,
      fontStyle: 'italic',
      opacity: .85
    }
  }, signature));
}
Object.assign(__ds_scope, { NoteCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/learning/NoteCard.jsx", error: String((e && e.message) || e) }); }

// components/learning/ProgressBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ProgressBar({
  value = 0,
  total = 100,
  label,
  style,
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, total ? value / total * 100 : 0));
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, rest), label && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-caption)',
      fontWeight: 500,
      letterSpacing: 'var(--tracking-caption)',
      color: 'var(--text-tertiary)',
      marginBottom: 6
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      borderRadius: 'var(--radius-pills)',
      background: 'var(--color-linen)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${pct}%`,
      borderRadius: 'var(--radius-pills)',
      background: 'var(--action-primary)',
      transition: 'width .4s ease'
    }
  })));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/learning/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/learning/ModuleCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ModuleCard({
  week,
  title,
  meta,
  progress = 0,
  total,
  done,
  cta = 'Continue',
  onOpen,
  isNew = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-card)',
      borderRadius: 'var(--radius-featured)',
      padding: '24px',
      boxShadow: 'var(--shadow-card)',
      fontFamily: 'var(--font-sans)',
      boxSizing: 'border-box',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-caption)',
      fontWeight: 700,
      letterSpacing: '.02em',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)'
    }
  }, week), isNew && /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "new"
  }, "New")), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '0 0 6px',
      fontSize: 'var(--text-heading-sm)',
      fontWeight: 700,
      letterSpacing: 'var(--tracking-heading-sm)',
      lineHeight: 1.25,
      color: 'var(--text-primary)'
    }
  }, title), meta && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 16px',
      fontSize: 'var(--text-body-sm)',
      letterSpacing: 'var(--tracking-body-sm)',
      color: 'var(--text-tertiary)'
    }
  }, meta), total ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.ProgressBar, {
    value: done,
    total: total,
    label: `${done} of ${total} done`
  })) : null, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    fullWidth: true,
    onClick: onOpen
  }, cta));
}
Object.assign(__ds_scope, { ModuleCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/learning/ModuleCard.jsx", error: String((e && e.message) || e) }); }

// components/learning/SessionCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SessionCard({
  kind = 'clinic',
  title,
  datetime,
  detail,
  seats,
  booked = false,
  onBook,
  style,
  ...rest
}) {
  const one = kind === 'oneonone';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-card)',
      borderRadius: 'var(--radius-cards)',
      padding: '20px',
      boxShadow: 'var(--shadow-card)',
      fontFamily: 'var(--font-sans)',
      boxSizing: 'border-box',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 'var(--radius-xl)',
      background: one ? 'var(--surface-contemplative)' : 'rgba(0,97,239,.08)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: one ? 'person' : 'groups',
    size: 22,
    color: one ? 'var(--text-inverse)' : 'var(--action-primary)'
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body)',
      fontWeight: 700,
      letterSpacing: 'var(--tracking-body)',
      color: 'var(--text-primary)'
    }
  }, title), one && /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "neutral"
  }, "1:1")), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 'var(--text-body-sm)',
      fontWeight: 500,
      letterSpacing: 'var(--tracking-body-sm)',
      color: 'var(--text-secondary)',
      marginTop: 4
    }
  }, datetime), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 'var(--text-caption)',
      letterSpacing: 'var(--tracking-caption)',
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, detail))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginTop: 16
    }
  }, seats && !booked && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-caption)',
      fontWeight: 500,
      color: 'var(--text-tertiary)'
    }
  }, seats), booked ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "done",
    icon: "check"
  }, "Booked") : /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    variant: "dark",
    onClick: onBook,
    style: {
      marginLeft: 'auto'
    }
  }, "Book a seat")));
}
Object.assign(__ds_scope, { SessionCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/learning/SessionCard.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TabBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function TabBar({
  items,
  active,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: {
      display: 'flex',
      background: 'var(--surface-card)',
      borderTop: '1px solid var(--border-card)',
      padding: '8px 8px calc(8px + env(safe-area-inset-bottom))',
      fontFamily: 'var(--font-sans)',
      boxSizing: 'border-box',
      ...style
    }
  }, rest), items.map(it => {
    const on = it.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      onClick: () => onChange && onChange(it.id),
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '6px 0',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        minHeight: 44,
        fontFamily: 'inherit'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: it.icon,
      size: 24,
      filled: on,
      color: on ? 'var(--action-primary)' : 'var(--text-tertiary)'
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: on ? 700 : 500,
        letterSpacing: '-0.11px',
        color: on ? 'var(--text-primary)' : 'var(--text-tertiary)'
      }
    }, it.label));
  }));
}
Object.assign(__ds_scope, { TabBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TabBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function TopBar({
  title,
  onBack,
  trailing,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 20px',
      background: 'var(--surface-page)',
      fontFamily: 'var(--font-sans)',
      boxSizing: 'border-box',
      ...style
    }
  }, rest), onBack ? /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "arrow_back",
    label: "Back",
    onClick: onBack,
    style: {
      marginLeft: -8
    }
  }) : null, title ? /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 'var(--text-subheading)',
      fontWeight: 700,
      letterSpacing: 'var(--tracking-subheading)',
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, title) : /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Wordmark, {
    size: "sm"
  })), trailing);
}
Object.assign(__ds_scope, { TopBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AboutScreen.jsx
try { (() => {
const {
  TopBar,
  Avatar,
  Card,
  Icon,
  Button
} = window.LumenDesignSystem_44a90c;
function AboutScreen({
  go
}) {
  const cv = [["school", "MSc Chemistry, National & Kapodistrian University of Athens"], ["history_edu", "12 years teaching IB Chemistry HL, 1:1 and small groups"], ["fact_check", "IB examiner — Paper 2, five sessions"], ["trending_up", "Students average 6.4 in HL Chemistry over the last three cohorts"]];
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "About Dimitra",
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "About Dimitra",
    onBack: () => go('home')
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '8px 20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    size: "xl"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-heading-sm)',
      fontWeight: 700,
      letterSpacing: 'var(--tracking-heading-sm)'
    }
  }, "Dimitra Anglou"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-sm)',
      fontWeight: 500,
      color: 'var(--text-secondary)',
      marginTop: 2
    }
  }, "IB Chemistry HL \xB7 Athens"))), /*#__PURE__*/React.createElement(Card, {
    padding: "20px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, cv.map(([ic, t]) => /*#__PURE__*/React.createElement("div", {
    key: ic,
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 20,
    color: "var(--color-deep-indigo)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      letterSpacing: 'var(--tracking-body-sm)',
      lineHeight: 1.5,
      color: 'var(--text-primary)'
    }
  }, t))))), /*#__PURE__*/React.createElement(Card, {
    surface: "indigo",
    featured: true
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-body)',
      lineHeight: 1.55,
      letterSpacing: 'var(--tracking-body)',
      fontWeight: 500
    }
  }, "“Chemistry isn't hard — it's cumulative. My job is making sure nothing quietly slips, so exam season feels like revision, not rescue.”"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '12px 0 0',
      fontSize: 'var(--text-body-sm)',
      fontStyle: 'italic',
      opacity: .8
    }
  }, "— Dimitra")), /*#__PURE__*/React.createElement(Button, {
    variant: "dark",
    fullWidth: true
  }, "Message Dimitra")));
}
Object.assign(window, {
  AboutScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AboutScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ClinicsScreen.jsx
try { (() => {
const {
  TopBar,
  FilterPill,
  SessionCard,
  ListRow
} = window.LumenDesignSystem_44a90c;
function ClinicsScreen() {
  const [booked, setBooked] = React.useState(false);
  const [tab, setTab] = React.useState('up');
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Clinics & 1:1",
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "Clinics & 1:1"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '4px 20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(FilterPill, {
    active: tab === 'up',
    onClick: () => setTab('up')
  }, "Upcoming"), /*#__PURE__*/React.createElement(FilterPill, {
    active: tab === 'past',
    onClick: () => setTab('past')
  }, "Recordings")), tab === 'up' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SessionCard, {
    title: "Weekly clinic",
    datetime: "Thu 15 Oct \xB7 18:00–19:00",
    detail: "Bring your titration curves",
    seats: "6 of 10 seats left",
    booked: booked,
    onBook: () => setBooked(true)
  }), /*#__PURE__*/React.createElement(SessionCard, {
    kind: "oneonone",
    title: "1:1 with Dimitra",
    datetime: "Pick a slot \xB7 30 min",
    detail: "2 slots left this month",
    onBook: () => {}
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 2px 0',
      fontSize: 'var(--text-caption)',
      letterSpacing: 'var(--tracking-caption)',
      color: 'var(--text-tertiary)',
      lineHeight: 1.5
    }
  }, "Clinics are small on purpose — come with questions, leave with fixed working.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ListRow, {
    icon: "play_circle",
    label: "Clinic — energetics recap",
    meta: "Thu 8 Oct \xB7 52 min"
  }), /*#__PURE__*/React.createElement(ListRow, {
    icon: "play_circle",
    label: "Clinic — equilibrium K & Q",
    meta: "Thu 1 Oct \xB7 48 min"
  }), /*#__PURE__*/React.createElement(ListRow, {
    icon: "play_circle",
    label: "Clinic — Born–Haber cycles",
    meta: "Thu 24 Sep \xB7 55 min"
  }))));
}
Object.assign(window, {
  ClinicsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ClinicsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/HomeScreen.jsx
try { (() => {
const {
  TopBar,
  Avatar,
  NoteCard,
  ModuleCard,
  ListRow
} = window.LumenDesignSystem_44a90c;
function HomeScreen({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Home",
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    trailing: /*#__PURE__*/React.createElement(Avatar, {
      initials: "NK",
      tone: "neutral"
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '8px 20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '8px 0 0',
      fontSize: 'var(--text-heading)',
      fontWeight: 700,
      letterSpacing: 'var(--tracking-heading)',
      lineHeight: 1.2
    }
  }, "Hi Nikos."), /*#__PURE__*/React.createElement(NoteCard, {
    date: "Mon 12 Oct",
    note: "Buffers trip everyone up the first week — watch video 2 twice before you try the exercises. Bring your titration curves on Thursday and we'll fix them together."
  }), /*#__PURE__*/React.createElement(ModuleCard, {
    week: "Week 6",
    isNew: true,
    title: "Buffers & titration curves",
    meta: "3 videos \xB7 slides \xB7 8 exercises",
    done: 2,
    total: 5,
    cta: "Continue module",
    onOpen: () => go('module')
  }), /*#__PURE__*/React.createElement(ListRow, {
    icon: "event",
    iconColor: "var(--color-deep-indigo)",
    label: "Thursday clinic",
    meta: "18:00 \xB7 6 seats left",
    onClick: () => go('clinics')
  }), /*#__PURE__*/React.createElement(ListRow, {
    icon: "school",
    iconColor: "var(--color-graphite)",
    label: "About Dimitra",
    meta: "Credentials, approach, results",
    onClick: () => go('about')
  })));
}
Object.assign(window, {
  HomeScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ModuleScreen.jsx
try { (() => {
const {
  TopBar,
  Badge,
  LessonRow,
  LockPanel,
  TextArea,
  Button,
  Toast,
  Icon
} = window.LumenDesignSystem_44a90c;
function ModuleScreen({
  go,
  initialUnlocked = false
}) {
  const [sheet, setSheet] = React.useState(false);
  const [unlocked, setUnlocked] = React.useState(initialUnlocked);
  const [toast, setToast] = React.useState(false);
  const submit = () => {
    setSheet(false);
    setUnlocked(true);
    setToast(true);
    setTimeout(() => setToast(false), 2600);
  };
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Module detail",
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "Week 6",
    onBack: () => go('home')
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '4px 20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '4px 0 2px',
      fontSize: 'var(--text-heading-sm)',
      fontWeight: 700,
      letterSpacing: 'var(--tracking-heading-sm)',
      lineHeight: 1.25
    }
  }, "Buffers & titration curves"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "new"
  }, "New this Monday"), /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, "Topic 8 \xB7 Acids & bases")), /*#__PURE__*/React.createElement(LessonRow, {
    kind: "video",
    title: "1 \xB7 What a buffer actually is",
    duration: "6 min",
    done: true
  }), /*#__PURE__*/React.createElement(LessonRow, {
    kind: "video",
    title: "2 \xB7 Why buffers resist pH change",
    duration: "7 min",
    done: true
  }), /*#__PURE__*/React.createElement(LessonRow, {
    kind: "video",
    title: "3 \xB7 Reading titration curves",
    duration: "9 min"
  }), /*#__PURE__*/React.createElement(LessonRow, {
    kind: "slides",
    title: "Slides — annotated",
    duration: "18 pages"
  }), /*#__PURE__*/React.createElement(LessonRow, {
    kind: "exercise",
    title: "Exercises — set A",
    duration: "8 questions"
  }), unlocked ? /*#__PURE__*/React.createElement(LessonRow, {
    kind: "solutions",
    title: "Worked solutions",
    duration: "Compare line by line"
  }) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, unlocked ? /*#__PURE__*/React.createElement(LockPanel, {
    locked: false,
    title: "Solutions unlocked",
    body: "Nice work. Compare line by line before Thursday's clinic — bring anything that still feels off.",
    cta: "Open solutions"
  }) : /*#__PURE__*/React.createElement(LockPanel, {
    title: "Solutions unlock after your attempt",
    body: "Upload a photo of your working — marks don't matter here, honest attempts do.",
    cta: "Submit my attempt",
    onAction: () => setSheet(true)
  }))), sheet && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(45,44,43,.4)',
      display: 'flex',
      alignItems: 'flex-end',
      zIndex: 5
    },
    onClick: () => setSheet(false)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      borderRadius: '24px 24px 0 0',
      padding: '24px 20px 28px',
      width: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 'var(--text-subheading)',
      fontWeight: 700,
      letterSpacing: 'var(--tracking-subheading)'
    }
  }, "Submit your attempt"), /*#__PURE__*/React.createElement("button", {
    style: {
      border: '1px dashed var(--border-divider)',
      background: 'var(--surface-page)',
      borderRadius: 'var(--radius-cards)',
      padding: '22px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      cursor: 'pointer',
      fontFamily: 'inherit'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "photo_camera",
    size: 24,
    color: "var(--text-secondary)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      fontWeight: 500,
      color: 'var(--text-secondary)'
    }
  }, "Photo of your working")), /*#__PURE__*/React.createElement(TextArea, {
    placeholder: "Anything you got stuck on? (optional)",
    rows: 2
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    fullWidth: true,
    onClick: submit
  }, "Send to Dimitra"))), toast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 12,
      left: 16,
      right: 16,
      zIndex: 6,
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Toast, {
    message: "Attempt sent to Dimitra",
    detail: "Solutions are unlocked below"
  })));
}
Object.assign(window, {
  ModuleScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ModuleScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ModulesScreen.jsx
try { (() => {
const {
  TopBar,
  FilterPill,
  ListRow,
  Badge,
  ModuleCard
} = window.LumenDesignSystem_44a90c;
function ModulesScreen({
  go
}) {
  const [cls, setCls] = React.useState('chem');
  const classes = [{
    id: 'chem',
    name: 'Chemistry HL',
    color: 'var(--subject-chemistry)'
  }, {
    id: 'math',
    name: 'Math AA SL',
    color: 'var(--subject-plum)'
  }];
  const chem = [["Week 5 — Energetics: Born–Haber cycles", true], ["Week 4 — Kinetics: rate expressions", true], ["Week 3 — Equilibrium: K & Q", true]];
  const math = [["Week 5 — Integration by parts", true], ["Week 4 — Differential equations", true], ["Week 3 — Maclaurin series", true]];
  const past = cls === 'chem' ? chem : math;
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Modules",
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "Modules"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '4px 20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 6
    }
  }, classes.map(c => /*#__PURE__*/React.createElement(FilterPill, {
    key: c.id,
    active: cls === c.id,
    onClick: () => setCls(c.id)
  }, c.name))), cls === 'chem' ? /*#__PURE__*/React.createElement(ModuleCard, {
    week: "Week 6 \xB7 This week",
    isNew: true,
    title: "Buffers & titration curves",
    meta: "3 videos \xB7 slides \xB7 8 exercises",
    done: 2,
    total: 5,
    cta: "Continue module",
    onOpen: () => go('module')
  }) : /*#__PURE__*/React.createElement(ModuleCard, {
    week: "Week 6 \xB7 This week",
    isNew: true,
    title: "Vectors: lines & planes",
    meta: "2 videos \xB7 slides \xB7 6 exercises",
    done: 0,
    total: 4,
    cta: "Start module",
    onOpen: () => {}
  }), past.map(([t]) => /*#__PURE__*/React.createElement(ListRow, {
    key: t,
    icon: "check_circle",
    iconColor: cls === 'chem' ? 'var(--subject-chemistry)' : 'var(--subject-plum)',
    label: t,
    meta: "Completed",
    trailing: /*#__PURE__*/React.createElement(Badge, {
      tone: "done",
      icon: "check"
    }, "Done"),
    chevron: false
  })), /*#__PURE__*/React.createElement(ListRow, {
    icon: "lock",
    iconColor: "var(--state-locked)",
    label: "Week 7",
    meta: "Unlocks Mon 19 Oct",
    chevron: false
  })));
}
Object.assign(window, {
  ModulesScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ModulesScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ProgressScreen.jsx
try { (() => {
const {
  TopBar,
  Card,
  ProgressBar,
  Icon,
  Badge
} = window.LumenDesignSystem_44a90c;
function ProgressScreen() {
  const topics = [["Stoichiometry", "done"], ["Atomic structure", "done"], ["Bonding & structure", "done"], ["Energetics", "done"], ["Kinetics", "done"], ["Equilibrium", "done"], ["Acids & bases", "now"], ["Redox", "next"], ["Organic chemistry", "next"]];
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Progress",
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "Progress"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '4px 20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Card, {
    featured: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-sm)',
      fontWeight: 500,
      color: 'var(--text-tertiary)',
      marginBottom: 4
    }
  }, "Nikos K. \xB7 IB Chemistry HL \xB7 May 2027"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-heading-sm)',
      fontWeight: 700,
      letterSpacing: 'var(--tracking-heading-sm)',
      marginBottom: 14
    }
  }, "12 of 18 modules"), /*#__PURE__*/React.createElement(ProgressBar, {
    value: 12,
    total: 18
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 18,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-subheading)',
      fontWeight: 700
    }
  }, "11"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-caption)',
      color: 'var(--text-tertiary)'
    }
  }, "attempts submitted")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-subheading)',
      fontWeight: 700
    }
  }, "9"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-caption)',
      color: 'var(--text-tertiary)'
    }
  }, "clinics attended")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-subheading)',
      fontWeight: 700
    }
  }, "Mar"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-caption)',
      color: 'var(--text-tertiary)'
    }
  }, "Paper 1 mock")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      background: 'var(--surface-card)',
      border: '1px solid var(--border-card)',
      borderRadius: 'var(--radius-cards)',
      padding: '6px 16px'
    }
  }, topics.map(([t, s], i) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '11px 0',
      borderBottom: i < topics.length - 1 ? '1px solid var(--color-page-cream)' : 'none'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s === 'done' ? 'check_circle' : s === 'now' ? 'radio_button_checked' : 'circle',
    size: 18,
    color: s === 'done' ? 'var(--action-primary)' : s === 'now' ? 'var(--color-deep-indigo)' : 'var(--color-driftwood)'
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 'var(--text-body-sm)',
      fontWeight: 500,
      letterSpacing: 'var(--tracking-body-sm)',
      color: s === 'next' ? 'var(--text-tertiary)' : 'var(--text-primary)'
    }
  }, t), s === 'now' && /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, "this week"))))));
}
Object.assign(window, {
  ProgressScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ProgressScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/WelcomeScreen.jsx
try { (() => {
const {
  Wordmark,
  Input,
  Button
} = window.LumenDesignSystem_44a90c;
function WelcomeScreen({
  onSignIn
}) {
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Welcome",
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '0 24px 32px',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Wordmark, {
    size: "xl",
    style: {
      alignItems: 'center'
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-subheading)',
      fontWeight: 500,
      letterSpacing: 'var(--tracking-subheading)',
      lineHeight: 1.4,
      color: 'var(--text-secondary)',
      maxWidth: 280
    }
  }, "Private IB Chemistry HL", /*#__PURE__*/React.createElement("br", null), "with Dimitra Anglou")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Email",
    type: "email",
    placeholder: "you@school.gr"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Invite code",
    placeholder: "From Dimitra's message",
    helper: "Lumen is invite-only — ask Dimitra if you need one"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: onSignIn
  }, "Sign in")));
}
Object.assign(window, {
  WelcomeScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/WelcomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/DesktopAbout.jsx
try { (() => {
const {
  Avatar,
  Card,
  Icon,
  Button
} = window.LumenDesignSystem_44a90c;
function DesktopAbout() {
  const cv = [["school", "MSc Chemistry, National & Kapodistrian University of Athens"], ["history_edu", "12 years teaching IB Chemistry HL, 1:1 and small groups"], ["fact_check", "IB examiner — Paper 2, five sessions"], ["trending_up", "Students average 6.4 in HL Chemistry over the last three cohorts"]];
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Desktop about",
    style: {
      maxWidth: 860,
      margin: '0 auto',
      padding: '48px 32px 64px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      marginBottom: 32
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    size: "xl"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 'var(--text-heading)',
      fontWeight: 700,
      letterSpacing: 'var(--tracking-heading)'
    }
  }, "Dimitra Anglou"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 0',
      fontSize: 'var(--text-body)',
      fontWeight: 500,
      color: 'var(--text-secondary)'
    }
  }, "IB Chemistry HL \xB7 Athens")), /*#__PURE__*/React.createElement(Button, {
    variant: "dark",
    style: {
      marginLeft: 'auto'
    }
  }, "Message Dimitra")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 24,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "28px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-sm)',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.03em',
      color: 'var(--text-tertiary)',
      marginBottom: 16
    }
  }, "Credentials"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, cv.map(([ic, t]) => /*#__PURE__*/React.createElement("div", {
    key: ic,
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 20,
    color: "var(--color-deep-indigo)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      lineHeight: 1.55,
      letterSpacing: 'var(--tracking-body-sm)'
    }
  }, t))))), /*#__PURE__*/React.createElement(Card, {
    surface: "indigo",
    featured: true
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-subheading)',
      lineHeight: 1.5,
      letterSpacing: 'var(--tracking-subheading)',
      fontWeight: 500
    }
  }, "“Chemistry isn't hard — it's cumulative. My job is making sure nothing quietly slips, so exam season feels like revision, not rescue.”"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '16px 0 0',
      fontSize: 'var(--text-body-sm)',
      fontStyle: 'italic',
      opacity: .8
    }
  }, "— Dimitra"))));
}
Object.assign(window, {
  DesktopAbout
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/DesktopAbout.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/DesktopHome.jsx
try { (() => {
const {
  NoteCard,
  ModuleCard,
  SessionCard,
  ListRow,
  ProgressBar,
  Card
} = window.LumenDesignSystem_44a90c;
function DesktopHome({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Desktop home",
    style: {
      maxWidth: 1040,
      margin: '0 auto',
      padding: '40px 32px 64px'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '0 0 16px',
      fontSize: 'var(--text-heading-lg)',
      fontWeight: 700,
      letterSpacing: 'var(--tracking-heading-lg)',
      lineHeight: 1.15
    }
  }, "Hi Nikos."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center',
      marginBottom: 24,
      fontFamily: 'var(--font-sans)'
    }
  }, [['Chemistry HL', 'var(--subject-chemistry)'], ['Math AA SL', 'var(--subject-plum)']].map(([n, c]) => /*#__PURE__*/React.createElement("span", {
    key: n,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      border: '1px solid var(--border-card)',
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-pills)',
      padding: '9px 16px',
      fontSize: 'var(--text-body-sm)',
      fontWeight: 500,
      letterSpacing: 'var(--tracking-body-sm)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: c
    }
  }), n)), /*#__PURE__*/React.createElement("span", {
    onClick: () => go('modules'),
    style: {
      fontSize: 'var(--text-body-sm)',
      fontWeight: 500,
      color: 'var(--action-primary)',
      cursor: 'pointer',
      marginLeft: 4
    }
  }, "All modules →")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.6fr 1fr',
      gap: 24,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(NoteCard, {
    date: "Mon 12 Oct",
    note: "Buffers trip everyone up the first week — watch video 2 twice before you try the exercises. Bring your titration curves on Thursday and we'll fix them together."
  }), /*#__PURE__*/React.createElement(ModuleCard, {
    week: "Week 6",
    isNew: true,
    title: "Buffers & titration curves",
    meta: "3 videos \xB7 slides \xB7 8 exercises",
    done: 2,
    total: 5,
    cta: "Continue module",
    onOpen: () => {}
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(SessionCard, {
    title: "Weekly clinic",
    datetime: "Thu 15 Oct \xB7 18:00–19:00",
    detail: "Bring your titration curves",
    seats: "6 of 10 seats left"
  }), /*#__PURE__*/React.createElement(Card, {
    padding: "20px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-sm)',
      fontWeight: 700,
      marginBottom: 12
    }
  }, "This term"), /*#__PURE__*/React.createElement(ProgressBar, {
    value: 12,
    total: 18,
    label: "12 of 18 modules"
  })), /*#__PURE__*/React.createElement(ListRow, {
    icon: "school",
    iconColor: "var(--color-graphite)",
    label: "About Dimitra",
    meta: "Credentials & approach",
    onClick: () => go('about')
  }))));
}
Object.assign(window, {
  DesktopHome
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/DesktopHome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/DesktopModules.jsx
try { (() => {
const {
  FilterPill,
  ListRow,
  Badge,
  ModuleCard,
  NoteCard
} = window.LumenDesignSystem_44a90c;
function DesktopModules() {
  const [cls, setCls] = React.useState('chem');
  const classes = [{
    id: 'chem',
    name: 'Chemistry HL',
    color: 'var(--subject-chemistry)'
  }, {
    id: 'math',
    name: 'Math AA SL',
    color: 'var(--subject-plum)'
  }];
  const chem = [["Week 5 — Energetics: Born–Haber cycles"], ["Week 4 — Kinetics: rate expressions"], ["Week 3 — Equilibrium: K & Q"], ["Week 2 — Bonding: shapes & polarity"], ["Week 1 — Stoichiometry refresh"]];
  const math = [["Week 5 — Integration by parts"], ["Week 4 — Differential equations"], ["Week 3 — Maclaurin series"], ["Week 2 — Complex numbers"], ["Week 1 — Sequences & series"]];
  const past = cls === 'chem' ? chem : math;
  const color = cls === 'chem' ? 'var(--subject-chemistry)' : 'var(--subject-plum)';
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Desktop modules",
    style: {
      maxWidth: 1040,
      margin: '0 auto',
      padding: '40px 32px 64px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 'var(--text-heading-lg)',
      fontWeight: 700,
      letterSpacing: 'var(--tracking-heading-lg)',
      lineHeight: 1.15,
      flex: 1
    }
  }, "Modules"), classes.map(c => /*#__PURE__*/React.createElement(FilterPill, {
    key: c.id,
    active: cls === c.id,
    onClick: () => setCls(c.id)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: cls === c.id ? '#fff' : c.color,
      display: 'inline-block'
    }
  }), c.name))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.6fr 1fr',
      gap: 24,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, cls === 'chem' ? /*#__PURE__*/React.createElement(ModuleCard, {
    week: "Week 6 \xB7 This week",
    isNew: true,
    title: "Buffers & titration curves",
    meta: "3 videos \xB7 slides \xB7 8 exercises",
    done: 2,
    total: 5,
    cta: "Continue module"
  }) : /*#__PURE__*/React.createElement(ModuleCard, {
    week: "Week 6 \xB7 This week",
    isNew: true,
    title: "Vectors: lines & planes",
    meta: "2 videos \xB7 slides \xB7 6 exercises",
    done: 0,
    total: 4,
    cta: "Start module"
  }), past.map(([t]) => /*#__PURE__*/React.createElement(ListRow, {
    key: t,
    icon: "check_circle",
    iconColor: color,
    label: t,
    meta: "Completed",
    trailing: /*#__PURE__*/React.createElement(Badge, {
      tone: "done",
      icon: "check"
    }, "Done"),
    chevron: false
  })), /*#__PURE__*/React.createElement(ListRow, {
    icon: "lock",
    iconColor: "var(--state-locked)",
    label: "Week 7",
    meta: "Unlocks Mon 19 Oct",
    chevron: false
  })), cls === 'chem' ? /*#__PURE__*/React.createElement(NoteCard, {
    compact: true,
    date: "Mon 12 Oct",
    note: "Buffers trip everyone up the first week — watch video 2 twice before the exercises. Bring your titration curves on Thursday."
  }) : /*#__PURE__*/React.createElement(NoteCard, {
    compact: true,
    date: "Mon 12 Oct",
    note: "Vectors reward drawing — sketch every plane before you compute. We'll do past-paper picks in Tuesday's clinic."
  })));
}
Object.assign(window, {
  DesktopModules
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/DesktopModules.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.FilterPill = __ds_scope.FilterPill;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.ListRow = __ds_scope.ListRow;

__ds_ns.Wordmark = __ds_scope.Wordmark;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.TextArea = __ds_scope.TextArea;

__ds_ns.LessonRow = __ds_scope.LessonRow;

__ds_ns.LockPanel = __ds_scope.LockPanel;

__ds_ns.ModuleCard = __ds_scope.ModuleCard;

__ds_ns.NoteCard = __ds_scope.NoteCard;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.SessionCard = __ds_scope.SessionCard;

__ds_ns.TabBar = __ds_scope.TabBar;

__ds_ns.TopBar = __ds_scope.TopBar;

})();
