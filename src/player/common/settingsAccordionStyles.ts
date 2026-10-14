import { alpha, Theme } from "@mui/material/styles";

/** Keeps expandable settings sections within the player's navy/purple palette. */
export function settingsAccordionStyles(theme: Theme) {
  return {
    backgroundColor: "transparent",
    backgroundImage: "none",
    border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
    borderRadius: `${theme.shape.borderRadius}px !important`,
    boxShadow: "none",
    overflow: "hidden",
    "&:before": { display: "none" },
    "&.Mui-expanded": { margin: 0 },
    "& .MuiAccordionSummary-root": {
      minHeight: 48,
      backgroundColor: alpha(theme.palette.primary.main, 0.035),
      "&.Mui-expanded": { minHeight: 48 },
    },
    "& .MuiAccordionSummary-content.Mui-expanded": { margin: "12px 0" },
    "& .MuiAccordionDetails-root": {
      borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
    },
  };
}
