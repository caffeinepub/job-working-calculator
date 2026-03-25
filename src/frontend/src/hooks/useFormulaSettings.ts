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
  pipeFactor: number; // default 0.02466
  roundBarFactor: number; // default 0.006162
  flatBarFactor: number; // default 0.00793

  // Labour module rates (Rs per meter)
  labourRateSS304: number; // default 550
  labourRateAL: number; // default 900

  // Flexibles labour rates (Rs per unit per 25mm weld)
  flexAlRate6: number; // default 120
  flexAlRate10: number; // default 125
  flexAlRate12: number; // default 130
  flexAlRate127: number; // default 135
  flexCuRate6: number; // default 210
  flexCuRate10: number; // default 220
  flexCuRate12: number; // default 230
  flexCuRate127: number; // default 235
  flexChamferingRate: number; // default 40
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
  labourRateSS304: 550,
  labourRateAL: 900,
  flexAlRate6: 120,
  flexAlRate10: 125,
  flexAlRate12: 130,
  flexAlRate127: 135,
  flexCuRate6: 210,
  flexCuRate10: 220,
  flexCuRate12: 230,
  flexCuRate127: 235,
  flexChamferingRate: 40,
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
