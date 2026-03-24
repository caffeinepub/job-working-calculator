import { useCallback, useEffect, useState } from "react";

export interface FormulaSettings {
  // Wastage
  invisibleWastagePct: number; // default 2
  visibleWastagePct: number; // default 10

  // Labor
  laborRateMin: number; // default 80
  laborRateMax: number; // default 150

  // Overhead & Profit
  overheadPct: number; // default 5
  profitPct: number; // default 10

  // Welding rates
  weldingRateSS304: number; // default 650
  weldingRateSS310: number; // default 1250

  // Raw material weight formulas (density factor per type)
  // Weight/m = (OD - WT) × WT × pipeFactor  for pipes
  // Weight/m = D² × roundBarFactor           for round bars
  // Weight/m = W × T × flatBarFactor         for flat/square bars
  pipeFactor: number; // default 0.02466
  roundBarFactor: number; // default 0.006162
  flatBarFactor: number; // default 0.00793
}

const DEFAULTS: FormulaSettings = {
  invisibleWastagePct: 2,
  visibleWastagePct: 10,
  laborRateMin: 80,
  laborRateMax: 150,
  overheadPct: 5,
  profitPct: 10,
  weldingRateSS304: 650,
  weldingRateSS310: 1250,
  pipeFactor: 0.02466,
  roundBarFactor: 0.006162,
  flatBarFactor: 0.00793,
};

const STORAGE_KEY = "jobcalc_formula_settings";

export function useFormulaSettings() {
  const [settings, setSettings] = useState<FormulaSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULTS, ...JSON.parse(stored) } as FormulaSettings;
      }
    } catch {
      // ignore
    }
    return DEFAULTS;
  });

  const [dirty, setDirty] = useState(false);

  const updateSetting = useCallback(
    <K extends keyof FormulaSettings>(key: K, value: FormulaSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      setDirty(true);
    },
    [],
  );

  const save = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setDirty(false);
  }, [settings]);

  const reset = useCallback(() => {
    setSettings(DEFAULTS);
    localStorage.removeItem(STORAGE_KEY);
    setDirty(false);
  }, []);

  // Load on mount (in case another tab changed settings)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({ ...DEFAULTS, ...JSON.parse(stored) });
      }
    } catch {
      // ignore
    }
  }, []);

  return { settings, updateSetting, save, reset, dirty };
}

// Singleton for use in other modules without React context
export function loadFormulaSettings(): FormulaSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULTS, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return DEFAULTS;
}
