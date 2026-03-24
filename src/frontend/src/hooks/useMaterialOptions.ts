import { useState } from "react";

const STORAGE_KEY = "jobcalc_material_options";

const BUILT_IN_TYPES = [
  "Round Bar",
  "Flat Bar",
  "Square Bar",
  "Pipe",
  "Angle",
  "Channel (ISMC)",
  "I-Beam (ISMB)",
  "Plate",
  "Sheet",
  "Wire Mesh",
];

type StoredOptions = {
  grades: string[];
  customTypes: string[];
};

function loadOptions(): StoredOptions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredOptions;
      return {
        grades: parsed.grades?.length ? parsed.grades : ["SS304", "SS310"],
        customTypes: parsed.customTypes ?? [],
      };
    }
  } catch {
    // ignore
  }
  return { grades: ["SS304", "SS310"], customTypes: [] };
}

function saveOptions(opts: StoredOptions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(opts));
}

export function useMaterialOptions() {
  const [options, setOptions] = useState<StoredOptions>(loadOptions);

  const update = (next: StoredOptions) => {
    saveOptions(next);
    setOptions(next);
  };

  const addGrade = (grade: string) => {
    const trimmed = grade.trim();
    if (!trimmed || options.grades.includes(trimmed)) return;
    update({ ...options, grades: [...options.grades, trimmed] });
  };

  const removeGrade = (grade: string) => {
    if (options.grades.length <= 1) return;
    update({ ...options, grades: options.grades.filter((g) => g !== grade) });
  };

  const addCustomType = (type: string) => {
    const trimmed = type.trim();
    if (!trimmed) return;
    const allTypes = [...BUILT_IN_TYPES, ...options.customTypes];
    if (allTypes.includes(trimmed)) return;
    update({ ...options, customTypes: [...options.customTypes, trimmed] });
  };

  const removeCustomType = (type: string) => {
    update({
      ...options,
      customTypes: options.customTypes.filter((t) => t !== type),
    });
  };

  return {
    grades: options.grades,
    customTypes: options.customTypes,
    builtInTypes: BUILT_IN_TYPES,
    addGrade,
    removeGrade,
    addCustomType,
    removeCustomType,
  };
}
