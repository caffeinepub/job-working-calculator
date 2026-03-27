import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getAuthActor } from "../authActor";
import { useAuth } from "../context/AuthContext";
import { useFormulaSettings } from "../hooks/useFormulaSettings";
import { useMaterialOptions } from "../hooks/useMaterialOptions";
import type {
  MachiningOpType,
  PredefinedOperation,
} from "../hooks/usePredefinedOperations";
import { usePredefinedOperations } from "../hooks/usePredefinedOperations";

type FormulaKey = Parameters<
  ReturnType<typeof useFormulaSettings>["updateSetting"]
>[0];

function FormulaRow({
  label,
  description,
  value,
  onChange,
  unit,
  step,
  min,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  step?: number;
  min?: number;
}) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Input
          type="number"
          value={value}
          step={step ?? 1}
          min={min ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-28 text-right h-8 text-sm"
        />
        {unit && (
          <span className="text-xs text-muted-foreground w-12">{unit}</span>
        )}
      </div>
    </div>
  );
}

function FormulaDisplay({ formula }: { formula: string }) {
  return (
    <div className="bg-muted/50 rounded-lg px-4 py-3 font-mono text-sm text-foreground border border-border">
      {formula}
    </div>
  );
}

function SectionHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {badge && (
        <Badge variant="secondary" className="text-xs">
          {badge}
        </Badge>
      )}
    </div>
  );
}

function CalcGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 rounded-lg p-4 space-y-3 mb-6">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Live Calculator
      </p>
      {children}
    </div>
  );
}

function CalcResult({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function MaterialOptionsTab() {
  const {
    grades,
    customTypes,
    builtInTypes,
    addGrade,
    removeGrade,
    addCustomType,
    removeCustomType,
  } = useMaterialOptions();

  const [newGrade, setNewGrade] = useState("");
  const [newType, setNewType] = useState("");

  const handleAddGrade = () => {
    const trimmed = newGrade.trim();
    if (!trimmed) return;
    if (grades.includes(trimmed)) {
      toast.error(`Grade "${trimmed}" already exists`);
      return;
    }
    addGrade(trimmed);
    setNewGrade("");
    toast.success(`Grade "${trimmed}" added`);
  };

  const handleRemoveGrade = (g: string) => {
    if (grades.length <= 1) {
      toast.error("At least one grade must remain");
      return;
    }
    removeGrade(g);
    toast.success(`Grade "${g}" removed`);
  };

  const handleAddType = () => {
    const trimmed = newType.trim();
    if (!trimmed) return;
    const all = [...builtInTypes, ...customTypes];
    if (all.includes(trimmed)) {
      toast.error(`Type "${trimmed}" already exists`);
      return;
    }
    addCustomType(trimmed);
    setNewType("");
    toast.success(`Type "${trimmed}" added`);
  };

  const handleRemoveType = (t: string) => {
    removeCustomType(t);
    toast.success(`Type "${t}" removed`);
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Grade Options */}
      <div className="bg-card border border-border rounded-xl p-5">
        <SectionHeader title="Grade Options" />
        <p className="text-sm text-muted-foreground mb-4">
          These grades appear in the material grade dropdown when adding or
          editing a raw material.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {grades.map((g) => (
            <div
              key={g}
              className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground rounded-md px-3 py-1.5 text-sm font-medium"
            >
              <span>{g}</span>
              <button
                type="button"
                onClick={() => handleRemoveGrade(g)}
                disabled={grades.length <= 1}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label={`Remove ${g}`}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. SS316, SS202"
            value={newGrade}
            onChange={(e) => setNewGrade(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddGrade()}
            className="flex-1"
            data-ocid="options.grade.input"
          />
          <Button
            onClick={handleAddGrade}
            disabled={!newGrade.trim()}
            data-ocid="options.grade.add_button"
          >
            Add
          </Button>
        </div>
      </div>

      {/* Material Type Options */}
      <div className="bg-card border border-border rounded-xl p-5">
        <SectionHeader title="Material Type Options" />
        <p className="text-sm text-muted-foreground mb-4">
          Built-in types are always available. You can add custom types below.
        </p>

        {/* Built-in types */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Built-in types (cannot be removed)
          </p>
          <div className="flex flex-wrap gap-2">
            {builtInTypes.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">
                {t}
              </Badge>
            ))}
          </div>
        </div>

        {/* Custom types */}
        {customTypes.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Custom types
            </p>
            <div className="flex flex-wrap gap-2">
              {customTypes.map((t) => (
                <div
                  key={t}
                  className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground rounded-md px-3 py-1.5 text-sm font-medium"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveType(t)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={`Remove ${t}`}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="e.g. Hex Bar, T-Section"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddType()}
            className="flex-1"
            data-ocid="options.type.input"
          />
          <Button
            onClick={handleAddType}
            disabled={!newType.trim()}
            data-ocid="options.type.add_button"
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

function DrillCalculator({
  baseRate,
  multiplierSS310,
}: { baseRate: number; multiplierSS310: number }) {
  const [dia, setDia] = useState(10);
  const [thk, setThk] = useState(10);
  const costSS304 = baseRate * (dia / 10) * (thk / 10);
  const costSS310 = costSS304 * multiplierSS310;
  return (
    <CalcGrid>
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Drill Dia (mm)</span>
          <input
            type="number"
            min={1}
            value={dia}
            onChange={(e) => setDia(Number(e.target.value))}
            className="w-20 h-8 px-2 rounded-md border border-border bg-background text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            Material Thk (mm)
          </span>
          <input
            type="number"
            min={1}
            value={thk}
            onChange={(e) => setThk(Number(e.target.value))}
            className="w-20 h-8 px-2 rounded-md border border-border bg-background text-sm"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 mt-2">
        <CalcResult
          label="SS304 cost/hole"
          value={`₹${costSS304.toFixed(2)}`}
        />
        <CalcResult
          label="SS310 cost/hole"
          value={`₹${costSS310.toFixed(2)}`}
        />
      </div>
    </CalcGrid>
  );
}

// ── Predefined Operations Tab ────────────────────────────────────────
const OP_TYPE_LABELS: Record<MachiningOpType, string> = {
  drilling: "Drilling",
  tapping: "Tapping",
  countersink: "Counter-sinking",
  milling: "Milling / Slotting",
  other: "Other",
};

const BLANK_OP: Omit<PredefinedOperation, "id"> = {
  name: "",
  opType: "drilling",
  drillDia: 10,
  matThickness: 10,
  tapSize: "M6",
  csDia: 10,
  slotLength: 50,
  otherCostPerUnit: 0,
  defaultGrade: "SS304",
};

function SecurityTab() {
  const { changePassword } = useAuth();
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPwd || !newPwd || !confirmPwd) return;
    if (newPwd !== confirmPwd) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPwd.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    setLoading(true);
    const ok = changePassword(currentPwd, newPwd);
    setLoading(false);
    if (ok) {
      toast.success("Password changed successfully");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } else {
      toast.error("Current password is incorrect");
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 max-w-md space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
      <form onSubmit={handleChange} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="cur-pwd" className="text-sm">
            Current Password
          </Label>
          <Input
            id="cur-pwd"
            type="password"
            autoComplete="current-password"
            value={currentPwd}
            onChange={(e) => setCurrentPwd(e.target.value)}
            data-ocid="security.input"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-pwd" className="text-sm">
            New Password
          </Label>
          <Input
            id="new-pwd"
            type="password"
            autoComplete="new-password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            data-ocid="security.input"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-pwd" className="text-sm">
            Confirm New Password
          </Label>
          <Input
            id="confirm-pwd"
            type="password"
            autoComplete="new-password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            data-ocid="security.input"
          />
        </div>
        <Button
          type="submit"
          className="w-full gap-2"
          disabled={loading || !currentPwd || !newPwd || !confirmPwd}
          data-ocid="security.submit_button"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          {loading ? "Saving…" : "Change Password"}
        </Button>
      </form>
    </div>
  );
}

function OperationsTab() {
  const { operations, addOperation, removeOperation } =
    usePredefinedOperations();
  const [form, setForm] = useState<Omit<PredefinedOperation, "id">>(BLANK_OP);
  const [showing, setShowing] = useState(false);

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addOperation(form);
    setForm(BLANK_OP);
    setShowing(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Predefined Operation Templates
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Save common machining operations as presets. Load them quickly in
              the Job Calculator.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-8 text-xs"
            onClick={() => setShowing((v) => !v)}
            data-ocid="formulas.ops.open_modal_button"
          >
            <Plus size={13} /> Add Operation
          </Button>
        </div>

        {showing && (
          <div className="border border-border rounded-lg p-4 mb-4 bg-muted/20 space-y-3">
            <h4 className="text-sm font-medium text-foreground">
              New Operation Preset
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input
                  className="h-8 text-sm"
                  placeholder="e.g. Drill M8 x 10mm"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  data-ocid="formulas.ops.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Operation Type</Label>
                <Select
                  value={form.opType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, opType: v as MachiningOpType }))
                  }
                >
                  <SelectTrigger
                    className="h-8 text-sm"
                    data-ocid="formulas.ops.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(OP_TYPE_LABELS) as MachiningOpType[]).map(
                      (t) => (
                        <SelectItem key={t} value={t}>
                          {OP_TYPE_LABELS[t]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Default Grade</Label>
                <Select
                  value={form.defaultGrade}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      defaultGrade: v as "SS304" | "SS310",
                    }))
                  }
                >
                  <SelectTrigger
                    className="h-8 text-sm"
                    data-ocid="formulas.ops.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SS304">SS304</SelectItem>
                    <SelectItem value="SS310">SS310</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.opType === "drilling" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Drill Diameter (mm)</Label>
                    <Input
                      type="number"
                      className="h-8 text-sm"
                      value={form.drillDia ?? ""}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          drillDia: Number(e.target.value),
                        }))
                      }
                      data-ocid="formulas.ops.input"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Material Thickness (mm)</Label>
                    <Input
                      type="number"
                      className="h-8 text-sm"
                      value={form.matThickness ?? ""}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          matThickness: Number(e.target.value),
                        }))
                      }
                      data-ocid="formulas.ops.input"
                    />
                  </div>
                </>
              )}
              {form.opType === "tapping" && (
                <div className="space-y-1">
                  <Label className="text-xs">Tap Size</Label>
                  <Select
                    value={form.tapSize ?? "M6"}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, tapSize: v }))
                    }
                  >
                    <SelectTrigger
                      className="h-8 text-sm"
                      data-ocid="formulas.ops.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["M6", "M8", "M10", "M12", "M16", "M20"].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {form.opType === "countersink" && (
                <div className="space-y-1">
                  <Label className="text-xs">Countersink Diameter (mm)</Label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    value={form.csDia ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, csDia: Number(e.target.value) }))
                    }
                    data-ocid="formulas.ops.input"
                  />
                </div>
              )}
              {form.opType === "milling" && (
                <div className="space-y-1">
                  <Label className="text-xs">Slot Length (mm)</Label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    value={form.slotLength ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        slotLength: Number(e.target.value),
                      }))
                    }
                    data-ocid="formulas.ops.input"
                  />
                </div>
              )}
              {form.opType === "other" && (
                <div className="space-y-1">
                  <Label className="text-xs">Cost Per Unit (₹)</Label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    value={form.otherCostPerUnit ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        otherCostPerUnit: Number(e.target.value),
                      }))
                    }
                    data-ocid="formulas.ops.input"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleAdd}
                disabled={!form.name.trim()}
                data-ocid="formulas.ops.submit_button"
              >
                <Plus size={12} /> Save Preset
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => setShowing(false)}
                data-ocid="formulas.ops.cancel_button"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {operations.length === 0 ? (
          <div
            className="text-center py-10 text-muted-foreground"
            data-ocid="formulas.ops.empty_state"
          >
            <p className="text-sm">No operation presets saved yet.</p>
            <p className="text-xs mt-1">
              Add presets to load them quickly in the Job Calculator machining
              section.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {operations.map((op, idx) => (
              <div
                key={op.id}
                className="flex items-center justify-between py-2 px-3 border border-border rounded-lg bg-background"
                data-ocid={`formulas.ops.item.${idx + 1}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {op.name}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {OP_TYPE_LABELS[op.opType]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {op.defaultGrade}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  onClick={() => removeOperation(op.id)}
                  data-ocid={`formulas.ops.delete_button.${idx + 1}`}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function Formulas() {
  const { settings, updateSetting, save, reset, dirty } = useFormulaSettings();

  // Round Rod
  const [rodD, setRodD] = useState(20);
  const [rodLen, setRodLen] = useState(1.0);
  const rodWpm = rodD * rodD * 0.00623;
  const rodW = rodWpm * rodLen;

  // Square Rod
  const [sqA, setSqA] = useState(20);
  const [sqLen, setSqLen] = useState(1.0);
  const sqWpm = sqA * sqA * 0.00793;
  const sqW = sqWpm * sqLen;

  // Flat / Plate / Sheet
  const [flatW2, setFlatW2] = useState(50);
  const [flatT, setFlatT] = useState(5);
  const [flatLen, setFlatLen] = useState(1.0);
  const flatWpm = flatW2 * flatT * 0.00793;
  const flatW = flatWpm * flatLen;

  // Pipe — using OD + ID (standard notation)
  const [pipeOD, setPipeOD] = useState(48.3);
  const [pipeID, setPipeID] = useState(44.3);
  const [pipeLen, setPipeLen] = useState(1.0);
  const pipeWpm = (pipeOD * pipeOD - pipeID * pipeID) * 0.00623;
  const pipeW = pipeWpm * pipeLen;

  // Angle (L Section)
  const [angA, setAngA] = useState(50);
  const [angB, setAngB] = useState(50);
  const [angT, setAngT] = useState(5);
  const [angLen, setAngLen] = useState(1.0);
  const angWpm = (angA + angB - angT) * angT * 0.00793;
  const angW = angWpm * angLen;

  // Channel (C Section)
  const [chH, setChH] = useState(75);
  const [chB, setChB] = useState(40);
  const [chT, setChT] = useState(5);
  const [chLen, setChLen] = useState(1.0);
  const chWpm = (2 * chH * chT + chB * chT) * 0.00793;
  const chW = chWpm * chLen;

  // I-Beam
  const [ibB, setIbB] = useState(100);
  const [ibTf, setIbTf] = useState(8);
  const [ibH, setIbH] = useState(200);
  const [ibTw, setIbTw] = useState(6);
  const [ibLen, setIbLen] = useState(1.0);
  const ibWpm = (2 * ibB * ibTf + ibH * ibTw) * 0.00793;
  const ibW = ibWpm * ibLen;

  const handleSave = () => {
    save();
    toast.success("Formula settings saved");
  };

  const handleReset = () => {
    reset();
    toast.info("Formula settings reset to defaults");
  };

  const update = (key: FormulaKey) => (v: number) => updateSetting(key, v);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Formulas &amp; Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            View and verify all formulas used in the app. Costing constants can
            be modified and saved.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-1.5"
          >
            <RefreshCw size={14} /> Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!dirty}
            className="gap-1.5"
          >
            <Save size={14} /> Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="weight">
        <TabsList className="w-full">
          <TabsTrigger value="weight" className="flex-1 text-xs sm:text-sm">
            Weight
          </TabsTrigger>
          <TabsTrigger value="jobcost" className="flex-1 text-xs sm:text-sm">
            Job Costing
          </TabsTrigger>
          <TabsTrigger value="welding" className="flex-1 text-xs sm:text-sm">
            Welding
          </TabsTrigger>
          <TabsTrigger value="options" className="flex-1 text-xs sm:text-sm">
            Options
          </TabsTrigger>
          <TabsTrigger value="labour" className="flex-1 text-xs sm:text-sm">
            Labour
          </TabsTrigger>
          <TabsTrigger value="flexibles" className="flex-1 text-xs sm:text-sm">
            Flexibles
          </TabsTrigger>
          <TabsTrigger value="machining" className="flex-1 text-xs sm:text-sm">
            Machining
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex-1 text-xs sm:text-sm">
            Operations
          </TabsTrigger>
          <TabsTrigger value="security" className="flex-1 text-xs sm:text-sm">
            Security
          </TabsTrigger>
        </TabsList>

        {/* ── MATERIAL WEIGHT ──────────────────────────────────── */}
        <TabsContent value="weight" className="space-y-4 mt-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm text-muted-foreground mb-4">
              All formulas use SS304 density = <strong>7.93 g/cm³</strong>.
              Dimensions are in <strong>mm</strong>, output is{" "}
              <strong>kg/m</strong>. Multiply by length (m) for total weight.
            </p>

            {/* 1. Round Rod */}
            <SectionHeader title="1. Round Rod (Solid)" badge="D² × 0.00623" />
            <FormulaDisplay formula="Weight/m  =  D²  ×  0.00623    [D in mm]" />
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Simplified from: (π/4) × D² × 0.00793
            </p>
            <CalcGrid>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Diameter D (mm)</Label>
                  <Input
                    type="number"
                    value={rodD}
                    onChange={(e) => setRodD(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Length (m)</Label>
                  <Input
                    type="number"
                    value={rodLen}
                    step={0.1}
                    onChange={(e) => setRodLen(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-6">
                <CalcResult
                  label="Weight/m"
                  value={`${rodWpm.toFixed(4)} kg/m`}
                />
                <CalcResult label="Total" value={`${rodW.toFixed(4)} kg`} />
              </div>
            </CalcGrid>

            {/* 2. Square Rod */}
            <SectionHeader title="2. Square Rod" badge="A² × 0.00793" />
            <FormulaDisplay formula="Weight/m  =  A²  ×  0.00793    [A = side in mm]" />
            <CalcGrid>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Side A (mm)</Label>
                  <Input
                    type="number"
                    value={sqA}
                    onChange={(e) => setSqA(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Length (m)</Label>
                  <Input
                    type="number"
                    value={sqLen}
                    step={0.1}
                    onChange={(e) => setSqLen(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-6">
                <CalcResult
                  label="Weight/m"
                  value={`${sqWpm.toFixed(4)} kg/m`}
                />
                <CalcResult label="Total" value={`${sqW.toFixed(4)} kg`} />
              </div>
            </CalcGrid>

            {/* 3. Flat / Plate / Sheet */}
            <SectionHeader
              title="3. Flat Bar / Plate / Sheet"
              badge="W × T × 0.00793"
            />
            <FormulaDisplay formula="Weight/m  =  Width  ×  Thickness  ×  0.00793    [mm]" />
            <CalcGrid>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Width (mm)</Label>
                  <Input
                    type="number"
                    value={flatW2}
                    onChange={(e) => setFlatW2(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Thickness (mm)</Label>
                  <Input
                    type="number"
                    value={flatT}
                    onChange={(e) => setFlatT(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Length (m)</Label>
                  <Input
                    type="number"
                    value={flatLen}
                    step={0.1}
                    onChange={(e) => setFlatLen(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-6">
                <CalcResult
                  label="Weight/m"
                  value={`${flatWpm.toFixed(4)} kg/m`}
                />
                <CalcResult label="Total" value={`${flatW.toFixed(4)} kg`} />
              </div>
            </CalcGrid>

            {/* 4. Pipe */}
            <SectionHeader
              title="4. Pipe (Hollow Round)"
              badge="(OD² − ID²) × 0.00623"
            />
            <FormulaDisplay formula="Weight/m  =  (OD² − ID²)  ×  0.00623    [OD, ID in mm]" />
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Simplified from: (π/4) × (OD² − ID²) × 0.00793
            </p>
            <CalcGrid>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">OD — Outer Dia (mm)</Label>
                  <Input
                    type="number"
                    value={pipeOD}
                    step={0.1}
                    onChange={(e) => setPipeOD(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">ID — Inner Dia (mm)</Label>
                  <Input
                    type="number"
                    value={pipeID}
                    step={0.1}
                    onChange={(e) => setPipeID(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Length (m)</Label>
                  <Input
                    type="number"
                    value={pipeLen}
                    step={0.1}
                    onChange={(e) => setPipeLen(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-6">
                <CalcResult
                  label="Weight/m"
                  value={`${pipeWpm.toFixed(4)} kg/m`}
                />
                <CalcResult label="Total" value={`${pipeW.toFixed(4)} kg`} />
              </div>
            </CalcGrid>

            {/* 5. Angle */}
            <SectionHeader
              title="5. Angle (L Section)"
              badge="(A+B−T) × T × 0.00793"
            />
            <FormulaDisplay formula="Weight/m  =  (A + B − T)  ×  T  ×  0.00793    [mm]" />
            <CalcGrid>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Leg A (mm)</Label>
                  <Input
                    type="number"
                    value={angA}
                    onChange={(e) => setAngA(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Leg B (mm)</Label>
                  <Input
                    type="number"
                    value={angB}
                    onChange={(e) => setAngB(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Thickness T (mm)</Label>
                  <Input
                    type="number"
                    value={angT}
                    onChange={(e) => setAngT(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Length (m)</Label>
                  <Input
                    type="number"
                    value={angLen}
                    step={0.1}
                    onChange={(e) => setAngLen(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-6">
                <CalcResult
                  label="Weight/m"
                  value={`${angWpm.toFixed(4)} kg/m`}
                />
                <CalcResult label="Total" value={`${angW.toFixed(4)} kg`} />
              </div>
            </CalcGrid>

            {/* 6. Channel */}
            <SectionHeader
              title="6. Channel (C Section)"
              badge="(2HT + BT) × 0.00793"
            />
            <FormulaDisplay formula="Weight/m  =  [(2 × H × T) + (B × T)]  ×  0.00793    [mm]" />
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Approx. formula. Use standard IS/ASTM section tables for precise
              values.
            </p>
            <CalcGrid>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Height H (mm)</Label>
                  <Input
                    type="number"
                    value={chH}
                    onChange={(e) => setChH(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Base Width B (mm)</Label>
                  <Input
                    type="number"
                    value={chB}
                    onChange={(e) => setChB(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Thickness T (mm)</Label>
                  <Input
                    type="number"
                    value={chT}
                    onChange={(e) => setChT(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Length (m)</Label>
                  <Input
                    type="number"
                    value={chLen}
                    step={0.1}
                    onChange={(e) => setChLen(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-6">
                <CalcResult
                  label="Weight/m"
                  value={`${chWpm.toFixed(4)} kg/m`}
                />
                <CalcResult label="Total" value={`${chW.toFixed(4)} kg`} />
              </div>
            </CalcGrid>

            {/* 7. I-Beam */}
            <SectionHeader
              title="7. I-Beam"
              badge="(2×B×Tf + H×Tw) × 0.00793"
            />
            <FormulaDisplay formula="Weight/m  =  [(2 × B × Tf) + (H × Tw)]  ×  0.00793    [mm]" />
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Approx. formula. Use standard IS/ASTM section tables for precise
              values.
            </p>
            <CalcGrid>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Flange Width B (mm)</Label>
                  <Input
                    type="number"
                    value={ibB}
                    onChange={(e) => setIbB(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Flange Thickness Tf (mm)</Label>
                  <Input
                    type="number"
                    value={ibTf}
                    onChange={(e) => setIbTf(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Web Height H (mm)</Label>
                  <Input
                    type="number"
                    value={ibH}
                    onChange={(e) => setIbH(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Web Thickness Tw (mm)</Label>
                  <Input
                    type="number"
                    value={ibTw}
                    onChange={(e) => setIbTw(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Length (m)</Label>
                  <Input
                    type="number"
                    value={ibLen}
                    step={0.1}
                    onChange={(e) => setIbLen(Number(e.target.value))}
                    className="h-8 mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-6">
                <CalcResult
                  label="Weight/m"
                  value={`${ibWpm.toFixed(4)} kg/m`}
                />
                <CalcResult label="Total" value={`${ibW.toFixed(4)} kg`} />
              </div>
            </CalcGrid>

            {/* Quick Reference */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                Quick Constants (SS304)
              </p>
              <div className="space-y-1 text-xs font-mono">
                <p>Round rod → D² × 0.00623</p>
                <p>Flat bar → W × T × 0.00793</p>
                <p>Pipe → (OD² − ID²) × 0.00623</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── JOB COSTING ──────────────────────────────────────── */}
        <TabsContent value="jobcost" className="space-y-6 mt-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <SectionHeader title="Full Job Costing Formula" />
            <div className="space-y-2">
              <FormulaDisplay formula="Raw Weight  =  Weight/m  ×  Length (per item)" />
              <FormulaDisplay
                formula={`Total Weight  =  Raw Weight  ×  (1 + ${settings.invisibleWastagePct}% invisible + ${settings.visibleWastagePct}% visible scrap)`}
              />
              <FormulaDisplay formula="Material Cost  =  Total Weight  ×  Current Rate" />
              <FormulaDisplay
                formula={`Labor Cost  =  Total Weight  ×  Labor Rate (${settings.laborRateMin}–${settings.laborRateMax} Rs/kg)`}
              />
              <FormulaDisplay formula="Welding Cost  =  Welding Weight  ×  Welding Rate (by grade)" />
              <FormulaDisplay
                formula={`Overhead  =  (Material + Labor + Welding)  ×  ${settings.overheadPct}%`}
              />
              <FormulaDisplay
                formula={`Profit  =  (Material + Labor + Welding + Overhead)  ×  ${settings.profitPct}%`}
              />
              <FormulaDisplay formula="Total Price  =  Material + Labor + Welding + Overhead + Profit + Transport" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <SectionHeader title="Wastage Settings" />
            <FormulaRow
              label="Invisible wastage"
              description="Added to raw weight — cutting losses, grinding, etc."
              value={settings.invisibleWastagePct}
              onChange={update("invisibleWastagePct")}
              unit="%"
            />
            <FormulaRow
              label="Visible scrap"
              description="Off-cuts that are recoverable but priced in"
              value={settings.visibleWastagePct}
              onChange={update("visibleWastagePct")}
              unit="%"
            />
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <SectionHeader title="Labor Rate Range" />
            <p className="text-sm text-muted-foreground mb-3">
              The job calculator lets you slide between min and max. Adjust
              bounds here.
            </p>
            <FormulaRow
              label="Minimum labor rate"
              description="Simple jobs"
              value={settings.laborRateMin}
              onChange={update("laborRateMin")}
              unit="Rs/kg"
            />
            <FormulaRow
              label="Maximum labor rate"
              description="High-complexity jobs"
              value={settings.laborRateMax}
              onChange={update("laborRateMax")}
              unit="Rs/kg"
            />
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <SectionHeader title="Overhead &amp; Profit" />
            <FormulaRow
              label="Overhead %"
              description="Applied on (Material + Labor + Welding)"
              value={settings.overheadPct}
              onChange={update("overheadPct")}
              unit="%"
            />
            <FormulaRow
              label="Profit %"
              description="Applied on (Material + Labor + Welding + Overhead)"
              value={settings.profitPct}
              onChange={update("profitPct")}
              unit="%"
            />
          </div>
        </TabsContent>

        {/* ── WELDING RATES ─────────────────────────────────────── */}
        <TabsContent value="welding" className="space-y-6 mt-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <SectionHeader title="Welding Cost Formula" />
            <FormulaDisplay formula="Welding Cost  =  Welding Weight (kg)  ×  Rate per Grade (Rs/kg)" />
            <p className="text-sm text-muted-foreground mt-3">
              Enter total weight of welding filler/consumable per grade. The
              system applies the rate below.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <SectionHeader title="Rates by Grade" />
            <FormulaRow
              label="SS304 welding rate"
              description="Standard austenitic grade"
              value={settings.weldingRateSS304}
              onChange={update("weldingRateSS304")}
              unit="Rs/kg"
            />
            <FormulaRow
              label="SS310 welding rate"
              description="High-temperature grade"
              value={settings.weldingRateSS310}
              onChange={update("weldingRateSS310")}
              unit="Rs/kg"
            />
          </div>
        </TabsContent>

        {/* ── MATERIAL OPTIONS ──────────────────────────────────── */}
        <TabsContent value="options">
          <MaterialOptionsTab />
        </TabsContent>

        {/* ── LABOUR RATES ──────────────────────────────────────── */}
        <TabsContent value="labour" className="space-y-6 mt-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Labour Costing Formula
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Used in the Labour Jobs module. Rate is charged per meter of weld
              length.
            </p>
            <FormulaDisplay formula="Labour Cost = Weld Length (meters) × Rate per meter" />
            <div className="mt-4">
              <FormulaRow
                label="SS304 labour rate"
                description="Rs per meter of weld for SS304 material"
                value={settings.labourRateSS304}
                onChange={(v) =>
                  updateSetting("labourRateSS304" as FormulaKey, v)
                }
                unit="Rs/m"
                step={1}
                min={0}
              />
              <FormulaRow
                label="Aluminium labour rate"
                description="Rs per meter of weld for Aluminium material"
                value={settings.labourRateAL}
                onChange={(v) => updateSetting("labourRateAL" as FormulaKey, v)}
                unit="Rs/m"
                step={1}
                min={0}
              />
              <FormulaRow
                label="AL Welding Base Rate (₹/line at 2mm thk)"
                description="Base rate per weld line per meter for 2mm thick sheet. Rate scales linearly with thickness."
                value={settings.alWeldBaseRate}
                onChange={(v) =>
                  updateSetting("alWeldBaseRate" as FormulaKey, v)
                }
                unit="₹/line/m"
                step={1}
                min={0}
              />
            </div>
          </div>
        </TabsContent>

        {/* ── FLEXIBLES RATES ─────────────────────────────────────── */}
        <TabsContent value="flexibles" className="space-y-6 mt-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Flexibles Costing Formulas
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Used in the Flexibles module for Aluminium and Copper expansion
              joints. Overhead % and Profit % are shared with Job Costing
              settings.
            </p>
            <FormulaDisplay formula="Sheet Stack Wt = (CenterLen+25) × Width × Thk × Count × density / 1,000,000" />
            <FormulaDisplay formula="Strip Wt = Width × 20 × 2 × 4 × density / 1,000,000" />
            <FormulaDisplay formula="Bar Wt = Length × Width × Thk × density / 1,000,000 (each, if supplied)" />
            <FormulaDisplay formula="Material Cost = TotalWeight × 1.2 × MaterialRate" />
            <FormulaDisplay formula="Cutting Cost = (SheetCount + 4) × 2.5" />
            <FormulaDisplay formula="Welding Cost = (Sheet Bunch Width ÷ 25) × Labour Rate" />
            <FormulaDisplay formula="Total Weld Length = (Width + BunchThickness) × 4" />
            <FormulaDisplay formula="Chamfering = Rs 80 (both bars always)" />
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Aluminium Labour Rates
            </h3>
            <FormulaRow
              label="AL rate at 6mm"
              description="Rs per 25mm weld unit for 6mm Aluminium"
              value={settings.flexAlRate6}
              onChange={(v) => updateSetting("flexAlRate6" as FormulaKey, v)}
              unit="Rs/unit"
              step={1}
              min={0}
            />
            <FormulaRow
              label="AL rate at 10mm"
              description="Rs per 25mm weld unit for 10mm Aluminium"
              value={settings.flexAlRate10}
              onChange={(v) => updateSetting("flexAlRate10" as FormulaKey, v)}
              unit="Rs/unit"
              step={1}
              min={0}
            />
            <FormulaRow
              label="AL rate at 12mm"
              description="Rs per 25mm weld unit for 12mm Aluminium"
              value={settings.flexAlRate12}
              onChange={(v) => updateSetting("flexAlRate12" as FormulaKey, v)}
              unit="Rs/unit"
              step={1}
              min={0}
            />
            <FormulaRow
              label="AL rate at 12.7mm"
              description="Rs per 25mm weld unit for 12.7mm Aluminium"
              value={settings.flexAlRate127}
              onChange={(v) => updateSetting("flexAlRate127" as FormulaKey, v)}
              unit="Rs/unit"
              step={1}
              min={0}
            />
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Copper Labour Rates
            </h3>
            <FormulaRow
              label="CU rate at 6mm"
              description="Rs per 25mm weld unit for 6mm Copper"
              value={settings.flexCuRate6}
              onChange={(v) => updateSetting("flexCuRate6" as FormulaKey, v)}
              unit="Rs/unit"
              step={1}
              min={0}
            />
            <FormulaRow
              label="CU rate at 10mm"
              description="Rs per 25mm weld unit for 10mm Copper"
              value={settings.flexCuRate10}
              onChange={(v) => updateSetting("flexCuRate10" as FormulaKey, v)}
              unit="Rs/unit"
              step={1}
              min={0}
            />
            <FormulaRow
              label="CU rate at 12mm"
              description="Rs per 25mm weld unit for 12mm Copper"
              value={settings.flexCuRate12}
              onChange={(v) => updateSetting("flexCuRate12" as FormulaKey, v)}
              unit="Rs/unit"
              step={1}
              min={0}
            />
            <FormulaRow
              label="CU rate at 12.7mm"
              description="Rs per 25mm weld unit for 12.7mm Copper"
              value={settings.flexCuRate127}
              onChange={(v) => updateSetting("flexCuRate127" as FormulaKey, v)}
              unit="Rs/unit"
              step={1}
              min={0}
            />
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Chamfering Rate
            </h3>
            <FormulaRow
              label="Chamfering cost (both bars)"
              description="Rs total for chamfering both bars — always applied"
              value={settings.flexChamferingRate}
              onChange={(v) =>
                updateSetting("flexChamferingRate" as FormulaKey, v)
              }
              unit="Rs total"
              step={1}
              min={0}
            />
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Flexibles — Material
            </h3>
            <FormulaRow
              label="AL Density (g/cm³)"
              description="Aluminium density used for weight calculations"
              value={settings.flexAlDensity}
              onChange={(v) => updateSetting("flexAlDensity" as FormulaKey, v)}
              unit="g/cm³"
              step={0.01}
              min={0}
            />
            <FormulaRow
              label="CU Density (g/cm³)"
              description="Copper density used for weight calculations"
              value={settings.flexCuDensity}
              onChange={(v) => updateSetting("flexCuDensity" as FormulaKey, v)}
              unit="g/cm³"
              step={0.01}
              min={0}
            />
            <FormulaRow
              label="AL Material Rate (Rs/kg)"
              description="Current Aluminium market rate per kg"
              value={settings.flexAlMaterialRate}
              onChange={(v) =>
                updateSetting("flexAlMaterialRate" as FormulaKey, v)
              }
              unit="Rs/kg"
              step={1}
              min={0}
            />
            <FormulaRow
              label="CU Material Rate (Rs/kg)"
              description="Current Copper market rate per kg"
              value={settings.flexCuMaterialRate}
              onChange={(v) =>
                updateSetting("flexCuMaterialRate" as FormulaKey, v)
              }
              unit="Rs/kg"
              step={1}
              min={0}
            />
            <FormulaRow
              label="Sheet Thickness (mm)"
              description="Default sheet thickness for Flexibles calculations"
              value={settings.flexSheetThickness}
              onChange={(v) =>
                updateSetting("flexSheetThickness" as FormulaKey, v)
              }
              unit="mm"
              step={0.01}
              min={0.1}
            />
            <FormulaRow
              label="Folding Cost per Fold (Rs)"
              description="Rs charged per fold operation"
              value={settings.flexFoldingCostPerFold}
              onChange={(v) =>
                updateSetting("flexFoldingCostPerFold" as FormulaKey, v)
              }
              unit="Rs/fold"
              step={1}
              min={0}
            />
            <FormulaRow
              label="Drilling Cost per Hole (Rs)"
              description="Rs charged per drill hole"
              value={settings.flexDrillingCostPerHole}
              onChange={(v) =>
                updateSetting("flexDrillingCostPerHole" as FormulaKey, v)
              }
              unit="Rs/hole"
              step={1}
              min={0}
            />
          </div>
        </TabsContent>

        {/* ── MACHINING RATES ──────────────────────────────────── */}
        <TabsContent value="machining" className="space-y-6 mt-4">
          {/* Drilling */}
          <div className="bg-card border border-border rounded-xl p-5">
            <SectionHeader title="Drilling" badge="SS304 base" />
            <FormulaDisplay formula="Cost per hole = BaseDrillRate × (Dia ÷ 10) × (Thickness ÷ 10) × GradeMultiplier" />
            <p className="text-xs text-muted-foreground mt-2 mb-4">
              At 10mm dia × 10mm thickness, cost = base rate. Scales
              proportionally with diameter and material thickness.
            </p>
            <FormulaRow
              label="Base drill rate (SS304)"
              description="Cost per hole at 10mm dia × 10mm thickness"
              value={settings.drillBaseRateSS304}
              onChange={(v) =>
                updateSetting("drillBaseRateSS304" as FormulaKey, v)
              }
              unit="₹/hole"
              step={1}
              min={0}
            />
            <FormulaRow
              label="SS310 grade multiplier"
              description="Applied on top of SS304 rate for SS310 material"
              value={settings.drillGradeMultiplierSS310}
              onChange={(v) =>
                updateSetting("drillGradeMultiplierSS310" as FormulaKey, v)
              }
              unit="×"
              step={0.1}
              min={1}
            />
            {/* Live calculator */}
            <DrillCalculator
              baseRate={settings.drillBaseRateSS304}
              multiplierSS310={settings.drillGradeMultiplierSS310}
            />
          </div>

          {/* Tapping */}
          <div className="bg-card border border-border rounded-xl p-5">
            <SectionHeader title="Tapping" badge="SS304 rates" />
            <p className="text-xs text-muted-foreground mb-4">
              SS310 tapping cost = SS304 rate × SS310 grade multiplier (set
              above).
            </p>
            {(["M6", "M8", "M10", "M12", "M16", "M20"] as const).map((size) => {
              const key = `tappingRate${size}` as FormulaKey;
              return (
                <FormulaRow
                  key={size}
                  label={`${size} tapping rate`}
                  description={`Cost per tap — ${size} thread, SS304`}
                  value={settings[key] as number}
                  onChange={(v) => updateSetting(key, v)}
                  unit="₹/hole"
                  step={1}
                  min={0}
                />
              );
            })}
          </div>

          {/* Counter-sinking */}
          <div className="bg-card border border-border rounded-xl p-5">
            <SectionHeader title="Counter-sinking" />
            <FormulaRow
              label="Counter-sink rate"
              description="Cost per counter-sunk hole (SS304). SS310 applies grade multiplier."
              value={settings.counterSinkRate}
              onChange={(v) =>
                updateSetting("counterSinkRate" as FormulaKey, v)
              }
              unit="₹/hole"
              step={1}
              min={0}
            />
          </div>

          {/* Milling / Slotting */}
          <div className="bg-card border border-border rounded-xl p-5">
            <SectionHeader title="Milling / Slotting" />
            <FormulaDisplay formula="Milling Cost = Rate per mm × Slot Length × GradeMultiplier" />
            <div className="mt-4">
              <FormulaRow
                label="Milling rate per mm"
                description="Cost per mm of slot length (SS304). SS310 applies grade multiplier."
                value={settings.millingRatePerMm}
                onChange={(v) =>
                  updateSetting("millingRatePerMm" as FormulaKey, v)
                }
                unit="₹/mm"
                step={0.5}
                min={0}
              />
            </div>
          </div>
        </TabsContent>

        {/* ── OPERATIONS ──────────────────────────────────── */}
        <TabsContent value="operations" className="space-y-6 mt-4">
          <OperationsTab />
        </TabsContent>
        {/* ── SECURITY ──────────────────────────────────────────── */}
        <TabsContent value="security" className="space-y-6 mt-4">
          <SecurityTab />
        </TabsContent>
      </Tabs>

      {dirty && (
        <div className="sticky bottom-4 flex justify-end">
          <div className="bg-card border border-border rounded-lg shadow-lg px-4 py-2 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Unsaved changes
            </span>
            <Button size="sm" onClick={handleSave} className="gap-1.5">
              <Save size={14} /> Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
