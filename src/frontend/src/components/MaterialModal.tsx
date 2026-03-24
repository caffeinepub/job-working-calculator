import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { RawMaterial } from "../backend";
import { useMaterialOptions } from "../hooks/useMaterialOptions";
import {
  MATERIAL_TYPES,
  type MaterialType,
  calculateWeightPerMeter,
  formatWeight,
  getSizeHint,
  isWireMesh,
} from "../utils/weightCalculator";

type FormData = {
  grade: string;
  materialType: MaterialType | "";
  size: string;
  weightPerMeter: string;
  currentRate: string;
  manualOverride: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    grade: string;
    materialType: string;
    size: string;
    weightPerMeter: number;
    currentRate: number;
  }) => void;
  editItem?: RawMaterial | null;
  isSaving: boolean;
};

const DEFAULT_FORM: FormData = {
  grade: "",
  materialType: "",
  size: "",
  weightPerMeter: "",
  currentRate: "",
  manualOverride: false,
};

function ModalContent({
  onClose,
  onSave,
  editItem,
  isSaving,
}: Omit<Props, "open">) {
  const { grades, customTypes, builtInTypes } = useMaterialOptions();
  const allTypes = [...builtInTypes, ...customTypes];

  const [form, setForm] = useState<FormData>(() => {
    if (editItem) {
      return {
        grade: editItem.grade,
        materialType: editItem.materialType as MaterialType,
        size: editItem.size,
        weightPerMeter: editItem.weightPerMeter.toFixed(3),
        currentRate: editItem.currentRate.toString(),
        manualOverride: false,
      };
    }
    return DEFAULT_FORM;
  });

  const materialType = form.materialType;
  const size = form.size;
  const manualOverride = form.manualOverride;
  const isMesh = materialType
    ? isWireMesh(materialType as MaterialType)
    : false;
  const typeSelected = materialType !== "";

  useEffect(() => {
    if (!materialType) return;
    if (manualOverride) return;
    const calc = calculateWeightPerMeter(materialType as MaterialType, size);
    if (calc !== null) {
      setForm((prev) => ({ ...prev, weightPerMeter: formatWeight(calc) }));
    } else {
      setForm((prev) => ({ ...prev, weightPerMeter: "" }));
    }
  }, [materialType, size, manualOverride]);

  const handleSave = () => {
    const w = Number.parseFloat(form.weightPerMeter);
    const r = Number.parseFloat(form.currentRate);
    if (
      !form.grade.trim() ||
      !form.materialType ||
      !form.size.trim() ||
      Number.isNaN(w) ||
      Number.isNaN(r)
    )
      return;
    onSave({
      grade: form.grade.trim(),
      materialType: form.materialType,
      size: form.size.trim(),
      weightPerMeter: w,
      currentRate: r,
    });
  };

  const isValid =
    form.grade.trim() &&
    form.materialType &&
    form.size.trim() &&
    form.weightPerMeter &&
    !Number.isNaN(Number.parseFloat(form.weightPerMeter)) &&
    form.currentRate &&
    !Number.isNaN(Number.parseFloat(form.currentRate));

  // For MATERIAL_TYPES filtering — include all types that match built-in MaterialType
  const selectableTypes = allTypes.filter(
    (t) => MATERIAL_TYPES.includes(t as MaterialType) || true,
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">
          {editItem ? "Edit Raw Material" : "Add Raw Material"}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {/* Grade */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Grade</Label>
          <Select
            value={form.grade || undefined}
            onValueChange={(v) => setForm((p) => ({ ...p, grade: v }))}
          >
            <SelectTrigger data-ocid="material.grade.select">
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              {grades.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Type */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Material Type</Label>
          <Select
            value={form.materialType || undefined}
            onValueChange={(v) =>
              setForm((p) => ({
                ...p,
                materialType: v as MaterialType,
                size: "",
                weightPerMeter: "",
              }))
            }
          >
            <SelectTrigger data-ocid="material.type.select">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {selectableTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Size */}
        <div className="space-y-1.5">
          <Label htmlFor="size" className="text-sm font-medium">
            Size
          </Label>
          <Input
            id="size"
            placeholder={
              typeSelected
                ? getSizeHint(form.materialType as MaterialType)
                : "Select a type first"
            }
            value={form.size}
            onChange={(e) => setForm((p) => ({ ...p, size: e.target.value }))}
            disabled={!typeSelected}
            className={!typeSelected ? "bg-muted text-muted-foreground" : ""}
            data-ocid="material.size.input"
          />
          {typeSelected && (
            <p className="text-xs text-muted-foreground">
              {getSizeHint(form.materialType as MaterialType)}
            </p>
          )}
          {!typeSelected && (
            <p className="text-xs text-muted-foreground">
              Select a material type first
            </p>
          )}
        </div>

        {/* Weight Per Meter / Per Sqft */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="weight" className="text-sm font-medium">
              {isMesh ? "Weight Per Sqft (kg/sqft)" : "Weight Per Meter (kg/m)"}
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Manual override
              </span>
              <Switch
                checked={form.manualOverride}
                onCheckedChange={(v) =>
                  setForm((p) => ({ ...p, manualOverride: v }))
                }
                disabled={!typeSelected}
                data-ocid="material.manual_override.switch"
              />
            </div>
          </div>
          <Input
            id="weight"
            type="number"
            step="0.001"
            placeholder={
              typeSelected ? "Auto-calculated" : "Select a type first"
            }
            value={form.weightPerMeter}
            onChange={(e) =>
              setForm((p) => ({ ...p, weightPerMeter: e.target.value }))
            }
            disabled={!typeSelected || !form.manualOverride}
            className={
              !typeSelected || !form.manualOverride
                ? "bg-muted text-muted-foreground"
                : ""
            }
            data-ocid="material.weight.input"
          />
          {typeSelected &&
            !form.manualOverride &&
            !form.weightPerMeter &&
            form.size && (
              <p className="text-xs text-muted-foreground">
                Enter a valid size to auto-calculate
              </p>
            )}
        </div>

        {/* Current Rate */}
        <div className="space-y-1.5">
          <Label htmlFor="rate" className="text-sm font-medium">
            {isMesh ? "Current Rate (₹/sqft)" : "Current Rate (₹/kg)"}
          </Label>
          <Input
            id="rate"
            type="number"
            step="0.01"
            placeholder="e.g. 68.50"
            value={form.currentRate}
            onChange={(e) =>
              setForm((p) => ({ ...p, currentRate: e.target.value }))
            }
            data-ocid="material.rate.input"
          />
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button
          variant="outline"
          onClick={onClose}
          data-ocid="material.cancel_button"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isValid || isSaving}
          data-ocid="material.submit_button"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : editItem ? (
            "Update Material"
          ) : (
            "Add Material"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

export function MaterialModal({
  open,
  onClose,
  onSave,
  editItem,
  isSaving,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        data-ocid="material.modal"
        key={`${String(open)}-${editItem?.id ?? "new"}`}
      >
        <ModalContent
          onClose={onClose}
          onSave={onSave}
          editItem={editItem}
          isSaving={isSaving}
        />
      </DialogContent>
    </Dialog>
  );
}
