export type DisplayDensity = {
  sidebarWidth: number;
  tabBarPadding: number;
  tabMinWidth: number;
  cardImageHeight: number;
  cardContentPadding: number;
  gridSpacing: number;
  pageGap: number;
  pageMarginTop: number;
  pageHeaderPadding: number;
  pageHorizontalPadding: number;
  contentClearance: number;
  playerBottom: number;
  playerPadding: number;
  playerWideBreakpoint: number;
  homeItemLimitSmall: number;
  homeItemLimitLarge: number;
};

// Settings is an overlay with form controls, so it must not inherit the
// narrower compact navigation width.
export const settingsPanelWidth = 280;
export const topBarHeight = 52;

export const comfortableDensity: DisplayDensity = {
  sidebarWidth: 240,
  tabBarPadding: 1,
  tabMinWidth: 120,
  cardImageHeight: 200,
  cardContentPadding: 2,
  gridSpacing: 2,
  pageGap: 2,
  pageMarginTop: 4,
  pageHeaderPadding: 4,
  pageHorizontalPadding: 2,
  contentClearance: 248,
  playerBottom: 16,
  playerPadding: 2,
  playerWideBreakpoint: 650,
  homeItemLimitSmall: 4,
  homeItemLimitLarge: 6,
};

export const compactDensity: DisplayDensity = {
  sidebarWidth: 200,
  tabBarPadding: 0.5,
  tabMinWidth: 96,
  cardImageHeight: 128,
  cardContentPadding: 1,
  gridSpacing: 1,
  pageGap: 1,
  pageMarginTop: 2,
  pageHeaderPadding: 2,
  pageHorizontalPadding: 1,
  contentClearance: 184,
  playerBottom: 8,
  playerPadding: 1,
  playerWideBreakpoint: 560,
  homeItemLimitSmall: 6,
  homeItemLimitLarge: 8,
};

export function getDisplayDensity(compact?: boolean): DisplayDensity {
  return compact ? compactDensity : comfortableDensity;
}
