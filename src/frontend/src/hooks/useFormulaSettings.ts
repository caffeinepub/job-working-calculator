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

  // AL Welding (new job type in Labour)
  alWeldBaseRate: number; // default 800 (Rs per weld line per meter at 2mm thk)

  // Flexibles labour rates (Rs per unit per 25mm weld)
  flexAlRate6: number; // default 110
  flexAlRate10: number; // default 115
  flexAlRate12: number; // default 120
  flexAlRate127: number; // default 125
  flexCuRate6: number; // default 200
  flexCuRate10: number; // default 210
  flexCuRate12: number; // default 220
  flexCuRate127: number; // default 225
  flexChamferingRate: number; // default 80 (total for both bars)

  // Flexibles material
  flexAlDensity: number; // default 2.7 (g/cm³)
  flexCuDensity: number; // default 8.96 (g/cm³)
  flexAlMaterialRate: number; // default 300 (Rs/kg)
  flexCuMaterialRate: number; // default 800 (Rs/kg)
  flexFoldingCostPerFold: number; // default 15 (Rs per fold)
  flexDrillingCostPerHole: number; // default 15 (Rs per drill)

  // Machining rates
  drillBaseRateSS304: number; // default 15 (Rs per hole at 10mm dia, 10mm thk)
  drillGradeMultiplierSS310: number; // default 2
  tappingRateM6: number; // default 15
  tappingRateM8: number; // default 20
  tappingRateM10: number; // default 25
  tappingRateM12: number; // default 30
  tappingRateM16: number; // default 40
  tappingRateM20: number; // default 50
  counterSinkRate: number; // default 20 (Rs per hole)
  millingRatePerMm: number; // default 2 (Rs per mm of slot length)
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
  alWeldBaseRate: 800,
  flexAlRate6: 110,
  flexAlRate10: 115,
  flexAlRate12: 120,
  flexAlRate127: 125,
  flexCuRate6: 200,
  flexCuRate10: 210,
  flexCuRate12: 220,
  flexCuRate127: 225,
  flexChamferingRate: 80,
  flexAlDensity: 2.7,
  flexCuDensity: 8.96,
  flexAlMaterialRate: 300,
  flexCuMaterialRate: 800,
  flexFoldingCostPerFold: 15,
  flexDrillingCostPerHole: 15,
  drillBaseRateSS304: 15,
  drillGradeMultiplierSS310: 2,
  tappingRateM6: 15,
  tappingRateM8: 20,
  tappingRateM10: 25,
  tappingRateM12: 30,
  tappingRateM16: 40,
  tappingRateM20: 50,
  counterSinkRate: 20,
  millingRatePerMm: 2,
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
      setSettings((prev) => {
        const updated = { ...prev, [key]: value };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
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
