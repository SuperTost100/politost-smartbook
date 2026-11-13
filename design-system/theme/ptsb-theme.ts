// PoliTost Smartbook, direction Carta: the antd v6 theme. Colours, fonts and sizes come from
// ptsb-tokens.ts, which build.mjs generates from tokens/tokens.json.
// Usage:
//   import { ConfigProvider, App as AntApp } from 'antd';
//   import { ptsbTheme } from './ptsb-theme';
//   <ConfigProvider theme={ptsbTheme(mode)}><AntApp>…</AntApp></ConfigProvider>
import { theme, type ThemeConfig } from 'antd';
import { FONT_MONO, FONT_SANS, ptsbColors, ptsbShadows } from './ptsb-tokens';

export { FONT_MONO, FONT_SANS, FONT_SERIF, ptsbColors, ptsbCovers, ptsbLayout, ptsbShadows } from './ptsb-tokens';
export type { PtsbCover } from './ptsb-tokens';

export type PtsbMode = 'light' | 'dark';

export function ptsbTheme(mode: PtsbMode = 'light'): ThemeConfig {
  const c = ptsbColors[mode];
  const s = ptsbShadows[mode];
  // antd resolves these in JS, so the shadow tokens get their colours spelled out instead of var(--shade).
  const raisedSm = s.raisedSm.replace('var(--shade)', c.shade).replace('var(--highlight)', c.highlight);
  return {
    algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    cssVar: { prefix: 'sb' },
    hashed: false,
    token: {
      // seed
      colorPrimary: c.primary,
      colorSuccess: c.success,
      colorWarning: c.starText,
      colorError: c.danger,
      colorInfo: c.info,
      colorLink: c.primaryText,
      fontFamily: FONT_SANS,
      fontFamilyCode: FONT_MONO,
      fontSize: 16,
      borderRadius: 14,
      controlHeight: 46,
      wireframe: false,
      motionDurationMid: '0.15s',
      // map / alias overrides so the algorithm does not drift from the tokens
      colorBgBase: c.bg,
      colorBgLayout: c.bg,
      colorBgContainer: c.page,
      colorBgElevated: c.surfaceOverlay,
      colorFillSecondary: c.surfaceRaised,
      colorFillTertiary: c.surfaceRaised,
      colorBgMask: c.scrim,
      colorTextBase: c.ink,
      colorText: c.ink,
      colorTextSecondary: c.inkMuted,
      colorTextTertiary: c.inkSubtle,
      colorTextPlaceholder: c.inkSubtle,
      colorBorder: c.borderControl,
      colorBorderSecondary: c.border,
      colorSplit: c.border,
      colorPrimaryBg: c.primarySoft,
      colorPrimaryHover: c.primaryHover,
      colorPrimaryActive: c.primaryActive,
      colorSuccessBg: c.successSoft,
      colorSuccessText: c.success,
      colorWarningBg: c.starSoft,
      colorWarningText: c.starText,
      colorErrorBg: c.dangerSoft,
      colorErrorText: c.danger,
      colorInfoBg: c.infoSoft,
      colorInfoText: c.info,
      borderRadiusSM: 10,
      borderRadiusLG: 24,
      controlHeightSM: 38,
      controlHeightLG: 52,
      lineWidthFocus: 2,
      boxShadowSecondary: s.shadowOverlay,
    },
    components: {
      Button: {
        borderRadius: 14,
        borderRadiusSM: 12,
        borderRadiusLG: 16,
        fontWeight: 600,
        paddingInline: 20,
        paddingInlineLG: 24,
        defaultBg: c.surface,
        defaultColor: c.ink,
        defaultBorderColor: c.border,
        defaultHoverBg: c.surface,
        defaultHoverColor: c.primaryText,
        defaultHoverBorderColor: c.border,
        defaultActiveBg: c.surface,
        defaultActiveColor: c.primaryText,
        defaultActiveBorderColor: c.border,
        defaultShadow: raisedSm,
        primaryShadow: raisedSm,
        dangerShadow: 'none',
        textHoverBg: c.surfaceRaised,
      },
      Segmented: { borderRadius: 16, borderRadiusSM: 12, trackBg: c.surfaceRaised, trackPadding: 5, itemColor: c.inkMuted, itemHoverColor: c.ink, itemHoverBg: 'transparent', itemSelectedBg: c.surface, itemSelectedColor: c.primaryText },
      Input: { borderRadius: 14, activeBorderColor: c.primaryText, hoverBorderColor: c.inkMuted, activeShadow: 'none', paddingInline: 16, colorBgContainer: c.page },
      Card: { borderRadiusLG: 24, colorBgContainer: c.surface, colorBorderSecondary: c.border, headerFontSize: 19, bodyPadding: 24 },
      Modal: { borderRadiusLG: 24, contentBg: c.surfaceOverlay, headerBg: c.surfaceOverlay, titleFontSize: 22 },
      Drawer: { colorBgElevated: c.surface },
      Popover: { colorBgElevated: c.surfaceOverlay },
      // antd sizes the tooltip box to controlHeight; at the theme's 46px the label sits at the top of a tall box.
      Tooltip: { colorBgSpotlight: c.ink, colorTextLightSolid: c.onInk, controlHeight: 30, borderRadius: 10 },
      Progress: { defaultColor: c.star, remainingColor: c.surfaceRaised, lineBorderRadius: 999 },
      Tag: { borderRadiusSM: 999, defaultBg: c.surfaceRaised, defaultColor: c.inkMuted },
      Tabs: { itemColor: c.inkMuted, itemSelectedColor: c.primaryText, itemHoverColor: c.ink, inkBarColor: c.primary, titleFontSize: 16 },
      Menu: { itemBg: 'transparent', subMenuItemBg: 'transparent', itemColor: c.ink, itemHoverBg: c.surfaceRaised, itemSelectedBg: c.surface, itemSelectedColor: c.primaryText, itemBorderRadius: 12, itemHeight: 40, itemMarginInline: 12 },
      Upload: { colorBorder: c.borderControl, colorFillAlter: c.surfaceRaised },
      Switch: { colorPrimary: c.primary, colorPrimaryHover: c.primaryHover },
      Checkbox: { borderRadiusSM: 6 },
      Table: { headerBg: c.surface, rowHoverBg: c.surfaceRaised, borderColor: c.border, headerColor: c.inkMuted },
    },
  };
}
