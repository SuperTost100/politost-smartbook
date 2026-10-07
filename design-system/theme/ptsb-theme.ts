// PoliTost Smartbook — Ant Design v6 + Ant Design Pro (ProComponents v3) theme. Values mirror tokens/tokens.json; change them there first.
// Usage:
//   import { ConfigProvider, App as AntApp } from 'antd';
//   import { ptsbTheme } from './ptsb-theme';
//   <ConfigProvider theme={ptsbTheme(mode)}><AntApp>…</AntApp></ConfigProvider>
import { theme, type ThemeConfig } from 'antd';
import type { ProTokenType } from '@ant-design/pro-components';

export type PtsbMode = 'light' | 'dark';

export const ptsbColors = {
  light: {
    bg: '#f6f5f1',
    page: '#fdfcf8',
    surface: '#ffffff',
    surfaceRaised: '#efede7',
    surfaceOverlay: '#ffffff',
    border: '#e4e2db',
    borderControl: '#7e8492',
    ink: '#15181e',
    inkMuted: '#50576a',
    inkSubtle: '#5f6675',
    onInk: '#ffffff',
    primary: '#0f6e66',
    primaryHover: '#0c5f58',
    primaryActive: '#0a514b',
    onPrimary: '#ffffff',
    primaryText: '#0b665f',
    primarySoft: '#e1f0ec',
    star: '#b7790c',
    starText: '#8a5a00',
    starSoft: '#fbf0d6',
    info: '#2451c7',
    infoSoft: '#e5ecfc',
    success: '#0f7a55',
    successSoft: '#dcf3e9',
    danger: '#c0343c',
    dangerSoft: '#fbe3e3',
    focusRing: '#0b665f',
    codeBg: '#f3f1eb',
    scrim: 'rgba(21, 24, 30, 0.40)',
  },
  dark: {
    bg: '#0d1015',
    page: '#12151b',
    surface: '#171b22',
    surfaceRaised: '#1e232c',
    surfaceOverlay: '#232935',
    border: '#292f3a',
    borderControl: '#6b7385',
    ink: '#e8eaef',
    inkMuted: '#a4abb8',
    inkSubtle: '#8a91a0',
    onInk: '#0d1015',
    primary: '#0f6e66',
    primaryHover: '#14807a',
    primaryActive: '#0c5f58',
    onPrimary: '#ffffff',
    primaryText: '#5fcfbf',
    primarySoft: '#0f2d2a',
    star: '#f4b942',
    starText: '#f4b942',
    starSoft: '#2d2412',
    info: '#7ea2ff',
    infoSoft: '#1b2744',
    success: '#4fd1a1',
    successSoft: '#12291f',
    danger: '#f26d6d',
    dangerSoft: '#2e1618',
    focusRing: '#f4b942',
    codeBg: '#0f1217',
    scrim: 'rgba(5, 7, 10, 0.72)',
  }
} as const;

export const FONT_SERIF = '"Source Serif 4", "Iowan Old Style", Georgia, serif';
export const FONT_SANS = 'Figtree, system-ui, -apple-system, "Segoe UI", sans-serif';
export const FONT_MONO = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';

export const ptsbLayout = { headerHeight: 64, siderWidth: 280, railWidth: 208, readingWidth: 720, wideWidth: 1040 } as const;

export function ptsbTheme(mode: PtsbMode = 'light'): ThemeConfig {
  const c = ptsbColors[mode];
  return {
    algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    cssVar: { prefix: 'sb' },
    hashed: false,
    token: {
      // seed
      colorPrimary: c.primary,
      colorSuccess: c.success,
      colorWarning: c.star,
      colorError: c.danger,
      colorInfo: c.info,
      colorLink: c.primaryText,
      fontFamily: FONT_SANS,
      fontFamilyCode: FONT_MONO,
      fontSize: 15,
      borderRadius: 12,
      controlHeight: 40,
      wireframe: false,
      motionDurationMid: '0.15s',
      // map / alias overrides so the algorithm does not drift from our tokens
      colorBgBase: c.bg,
      colorBgLayout: c.bg,
      colorBgContainer: c.surface,
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
      borderRadiusSM: 8,
      borderRadiusLG: 16,
      controlHeightSM: 32,
      controlHeightLG: 48,
      lineWidthFocus: 2,
      boxShadowSecondary: mode === 'dark' ? '0 16px 40px rgba(0, 0, 0, 0.55)' : '0 12px 32px rgba(21, 24, 30, 0.14)',
    },
    components: {
      Button: { borderRadius: 999, borderRadiusSM: 999, borderRadiusLG: 999, fontWeight: 600, primaryShadow: 'none', defaultShadow: 'none', dangerShadow: 'none', paddingInline: 20, paddingInlineLG: 24, defaultBorderColor: c.borderControl, defaultBg: 'transparent' },
      Segmented: { borderRadius: 999, borderRadiusSM: 999, trackBg: c.surface, trackPadding: 4, itemColor: c.inkMuted, itemHoverColor: c.ink, itemHoverBg: c.surfaceRaised, itemSelectedBg: c.primarySoft, itemSelectedColor: c.primaryText, fontFamily: FONT_MONO, fontSize: 12 },
      Input: { borderRadius: 999, activeBorderColor: c.primaryText, hoverBorderColor: c.inkMuted, activeShadow: 'none', paddingInline: 16 },
      Card: { borderRadiusLG: 16, colorBgContainer: c.surface, colorBorderSecondary: c.border, headerFontSize: 17, bodyPadding: 24 },
      Modal: { borderRadiusLG: 24, contentBg: c.surfaceOverlay, headerBg: c.surfaceOverlay, titleFontSize: 22 },
      Drawer: { colorBgElevated: c.bg },
      Popover: { colorBgElevated: c.surfaceOverlay },
      Tooltip: { colorBgSpotlight: c.ink, colorTextLightSolid: c.onInk },
      Progress: { defaultColor: c.primary, remainingColor: c.surfaceRaised, lineBorderRadius: 999 },
      Tag: { borderRadiusSM: 8, defaultBg: c.surfaceRaised, defaultColor: c.inkMuted, fontFamily: FONT_MONO },
      Tabs: { itemColor: c.inkMuted, itemSelectedColor: c.primaryText, itemHoverColor: c.ink, inkBarColor: c.primary, titleFontSize: 15 },
      Menu: { itemBg: 'transparent', subMenuItemBg: 'transparent', itemColor: c.ink, itemHoverBg: c.surfaceRaised, itemSelectedBg: c.primarySoft, itemSelectedColor: c.primaryText, itemBorderRadius: 8, itemHeight: 38, itemMarginInline: 12 },
      Anchor: { linkPaddingBlock: 4, linkPaddingInlineStart: 12 },
      Upload: { colorBorder: c.borderControl, colorFillAlter: c.surface },
      Switch: { colorPrimary: c.primary, colorPrimaryHover: c.primaryHover },
      Table: { headerBg: c.surface, rowHoverBg: c.surfaceRaised, borderColor: c.border, headerColor: c.inkMuted },
    },
  };
}

// ── Ant Design Pro (ProComponents v3) ───────────────────────────────────────
// ProLayout reads its own `token` prop; the rest of ProComponents inherit the antd theme above.

export function ptsbProLayoutToken(mode: PtsbMode = 'light'): ProTokenType['layout'] {
  const c = ptsbColors[mode];
  return {
    bgLayout: c.page,
    colorPrimary: c.primary,
    header: {
      colorBgHeader: c.bg,
      colorBgScrollHeader: c.bg,
      colorHeaderTitle: c.ink,
      colorTextMenu: c.inkMuted,
      colorTextMenuSecondary: c.inkMuted,
      colorTextMenuSelected: c.primaryText,
      colorTextMenuActive: c.ink,
      colorBgMenuItemHover: c.surfaceRaised,
      colorBgMenuItemSelected: c.primarySoft,
      colorBgMenuElevated: c.surfaceOverlay,
      colorTextRightActionsItem: c.inkMuted,
      colorBgRightActionsItemHover: c.surfaceRaised,
      heightLayoutHeader: ptsbLayout.headerHeight,
    },
    sider: {
      colorMenuBackground: c.bg,
      colorBgCollapsedButton: c.surface,
      colorTextCollapsedButton: c.inkMuted,
      colorTextCollapsedButtonHover: c.ink,
      colorMenuItemDivider: c.border,
      colorTextMenu: c.ink,
      colorTextMenuSecondary: c.inkMuted,
      colorTextMenuSelected: c.primaryText,
      colorTextMenuActive: c.ink,
      colorTextMenuItemHover: c.ink,
      colorBgMenuItemHover: c.surfaceRaised,
      colorBgMenuItemSelected: c.primarySoft,
      colorBgMenuItemCollapsedElevated: c.surfaceOverlay,
      colorTextSubMenuSelected: c.primaryText,
      paddingInlineLayoutMenu: 12,
      paddingBlockLayoutMenu: 24,
    },
    pageContainer: {
      colorBgPageContainer: c.page,
      colorBgPageContainerFixed: c.page,
      paddingInlinePageContainerContent: 32,
      paddingBlockPageContainerContent: 48,
    },
  };
}
