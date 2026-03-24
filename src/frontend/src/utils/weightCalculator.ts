/**
 * Weight Per Meter calculator for common steel sections.
 * Steel density: 7930 kg/m³ (SS304)
 */

const STEEL_DENSITY = 7930; // kg/m³ — SS304 density

export type MaterialType =
  | "Round Bar"
  | "Flat Bar"
  | "Square Bar"
  | "Pipe"
  | "Angle"
  | "Channel (ISMC)"
  | "I-Beam (ISMB)"
  | "Plate"
  | "Sheet"
  | "Wire Mesh";

export const MATERIAL_TYPES: MaterialType[] = [
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

export function isWireMesh(type: string): boolean {
  return type === "Wire Mesh";
}

export function getSizeHint(type: MaterialType): string {
  switch (type) {
    case "Round Bar":
      return "e.g. 20 mm (diameter)";
    case "Flat Bar":
      return "e.g. 50x6 mm (width x thickness)";
    case "Square Bar":
      return "e.g. 25 mm (side)";
    case "Pipe":
      return "e.g. 60.3x3.6 mm (OD x wall thickness)";
    case "Angle":
      return "e.g. 65x65x6 mm (L x L x thickness)";
    case "Channel (ISMC)":
      return "e.g. 100 mm (depth)";
    case "I-Beam (ISMB)":
      return "e.g. 200 mm (depth)";
    case "Plate":
      return "e.g. 2000x8 mm (width x thickness)";
    case "Sheet":
      return "e.g. 1250x2 mm (width x thickness)";
    case "Wire Mesh":
      return "e.g. 12x12x3 mm (gap_w x gap_h x rod_dia)";
    default:
      return "";
  }
}

// ISMC standard weights (depth mm → kg/m)
const ISMC_TABLE: Record<number, number> = {
  75: 5.7,
  100: 7.85,
  125: 10.4,
  150: 12.4,
  175: 14.0,
  200: 17.1,
  225: 20.2,
  250: 22.8,
  300: 30.4,
  350: 38.0,
  400: 45.7,
};

// ISMB standard weights (depth mm → kg/m)
const ISMB_TABLE: Record<number, number> = {
  100: 8.9,
  125: 11.9,
  150: 14.9,
  175: 19.3,
  200: 25.4,
  225: 31.2,
  250: 37.3,
  300: 46.1,
  350: 52.4,
  400: 61.3,
  450: 72.4,
  500: 86.9,
  550: 103.7,
  600: 122.6,
};

function parseFloat2(s: string): number {
  return Number.parseFloat(s.trim());
}

export function calculateWeightPerMeter(
  type: MaterialType,
  size: string,
): number | null {
  if (!size.trim()) return null;

  // Strip trailing 'mm' or 'MM' and units
  const cleaned = size.replace(/mm/i, "").trim();

  try {
    switch (type) {
      case "Round Bar": {
        const d = parseFloat2(cleaned) / 1000;
        if (Number.isNaN(d) || d <= 0) return null;
        return (Math.PI / 4) * d * d * STEEL_DENSITY;
      }

      case "Square Bar": {
        const s = parseFloat2(cleaned) / 1000;
        if (Number.isNaN(s) || s <= 0) return null;
        return s * s * STEEL_DENSITY;
      }

      case "Flat Bar":
      case "Plate":
      case "Sheet": {
        const parts = cleaned.split(/[xX*]/);
        if (parts.length < 2) return null;
        const w = parseFloat2(parts[0]) / 1000;
        const t = parseFloat2(parts[1]) / 1000;
        if (Number.isNaN(w) || Number.isNaN(t) || w <= 0 || t <= 0) return null;
        return w * t * STEEL_DENSITY;
      }

      case "Pipe": {
        const parts = cleaned.split(/[xX*]/);
        if (parts.length < 2) return null;
        const od = parseFloat2(parts[0]) / 1000;
        const wt = parseFloat2(parts[1]) / 1000;
        if (Number.isNaN(od) || Number.isNaN(wt) || od <= 0 || wt <= 0)
          return null;
        const id = od - 2 * wt;
        return (Math.PI / 4) * (od * od - id * id) * STEEL_DENSITY;
      }

      case "Angle": {
        const parts = cleaned.split(/[xX*]/);
        if (parts.length < 3) {
          if (parts.length === 2) {
            const l = parseFloat2(parts[0]) / 1000;
            const t = parseFloat2(parts[1]) / 1000;
            if (Number.isNaN(l) || Number.isNaN(t)) return null;
            return (2 * l - t) * t * STEEL_DENSITY;
          }
          return null;
        }
        const l = parseFloat2(parts[0]) / 1000;
        const t = parseFloat2(parts[2]) / 1000;
        if (Number.isNaN(l) || Number.isNaN(t) || l <= 0 || t <= 0) return null;
        return (2 * l - t) * t * STEEL_DENSITY;
      }

      case "Channel (ISMC)": {
        const depth = Math.round(parseFloat2(cleaned));
        if (Number.isNaN(depth)) return null;
        if (ISMC_TABLE[depth]) return ISMC_TABLE[depth];
        return depth * 0.1;
      }

      case "I-Beam (ISMB)": {
        const depth = Math.round(parseFloat2(cleaned));
        if (Number.isNaN(depth)) return null;
        if (ISMB_TABLE[depth]) return ISMB_TABLE[depth];
        return depth * 0.12;
      }

      case "Wire Mesh": {
        // size format: "gapW x gapH x dia" in mm
        const parts = cleaned.split(/[xX*]/);
        if (parts.length < 3) return null;
        const gapW = parseFloat2(parts[0]);
        const gapH = parseFloat2(parts[1]);
        const dia = parseFloat2(parts[2]);
        if (
          Number.isNaN(gapW) ||
          Number.isNaN(gapH) ||
          Number.isNaN(dia) ||
          gapW <= 0 ||
          gapH <= 0 ||
          dia <= 0
        )
          return null;
        // Rods per meter in each direction (pitch = gap + dia)
        const countX = 1000 / (gapW + dia);
        const countY = 1000 / (gapH + dia);
        // Weight per m²: each rod in X direction spans 1m length, each in Y spans 1m
        // Volume per m² = (countX + countY) * (π/4) * (dia/1000)² * 1m
        const weightPerM2 =
          (countX + countY) * (Math.PI / 4) * (dia / 1000) ** 2 * STEEL_DENSITY;
        // Apply crimp factor (1.03) for crimped wire mesh — accounts for extra wire length due to crimping
        const CRIMP_FACTOR = 1.03;
        // Convert kg/m² to kg/sqft (1 m² = 10.764 sqft)
        const weightPerSqft = (weightPerM2 * CRIMP_FACTOR) / 10.764;
        return weightPerSqft;
      }

      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function formatWeight(w: number | null): string {
  if (w === null) return "";
  return w.toFixed(3);
}
