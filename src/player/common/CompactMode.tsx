import React, { createContext, useContext } from "react";
import { getDisplayDensity } from "../../common/displayDensity";

const CompactModeContext = createContext(false);

export function CompactModeProvider({
  compact,
  children,
}: {
  compact: boolean;
  children: React.ReactNode;
}) {
  return (
    <CompactModeContext.Provider value={compact}>
      {children}
    </CompactModeContext.Provider>
  );
}

export function useCompactMode() {
  return useContext(CompactModeContext);
}

export function useDisplayDensity() {
  return getDisplayDensity(useCompactMode());
}
