import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const AL_DENSITY = 2.7;

function getAlRate(): number {
  try {
    const v = localStorage.getItem("flexibles_al_rate");
    return v ? Number(v) : 300;
  } catch {
    return 300;
  }
}

function getLabourRates(): Record<string, number> {
  try {
    const v = localStorage.getItem("flexibles_labour_rates");
    if (v) return JSON.parse(v);
  } catch {
    // ignore
  }
  return { "6": 110, "10": 115, "12": 120, "12.7": 125 };
}

function interpolateLabourRate(
  thk: number,
  rates: Record<string, number>,
): number {
  const points = Object.entries(rates)
    .map(([k, v]) => ({ thk: Number(k), rate: v }))
    .sort((a, b) => a.thk - b.thk);
  if (points.length === 0) return 110;
  if (thk <= points[0].thk) return points[0].rate;
  if (thk >= points[points.length - 1].thk)
    return points[points.length - 1].rate;
  for (let i = 0; i < points.length - 1; i++) {
    const lo = points[i];
    const hi = points[i + 1];
    if (thk >= lo.thk && thk <= hi.thk) {
      const t = (thk - lo.thk) / (hi.thk - lo.thk);
      return lo.rate + t * (hi.rate - lo.rate);
    }
  }
  return points[points.length - 1].rate;
}

export function CustomerFlexibles() {
  const { currentUser, logout } = useAuth();
  const discountPct = currentUser?.discountPct ?? 0;

  const [bunchWidth, setBunchWidth] = useState<number | "">("");
  const [bunchThk, setBunchThk] = useState<number | "">("");
  const [centerLength, setCenterLength] = useState<number | "">("");
  const [sheetThk, setSheetThk] = useState<"0.28" | "0.3">("0.3");
  const [barsMode, setBarsMode] = useState<"customer" | "include">("customer");

  // Bar 1
  const [bar1Length, setBar1Length] = useState<number | "">("");
  const [bar1Width, setBar1Width] = useState<number | "">("");
  const [bar1Thk, setBar1Thk] = useState<number | "">("");

  // Bar 2
  const [sameAsBar1, setSameAsBar1] = useState(true);
  const [bar2Length, setBar2Length] = useState<number | "">("");
  const [bar2Width, setBar2Width] = useState<number | "">("");
  const [bar2Thk, setBar2Thk] = useState<number | "">("");

  const matRate = getAlRate();
  const labourRates = getLabourRates();

  const widthN = typeof bunchWidth === "number" ? bunchWidth : 0;
  const thkN = typeof bunchThk === "number" ? bunchThk : 0;
  const lenN = typeof centerLength === "number" ? centerLength : 0;
  const sheetThkN = Number(sheetThk);

  const sheetCount = thkN > 0 && sheetThkN > 0 ? thkN / sheetThkN : 0;

  // Weights
  const sheetStackWeight =
    sheetCount > 0 && widthN > 0 && lenN > 0
      ? ((lenN + 25) * widthN * sheetThkN * sheetCount * AL_DENSITY) / 1_000_000
      : 0;
  const stripWeight =
    widthN > 0 ? (widthN * 20 * 2 * 4 * AL_DENSITY) / 1_000_000 : 0;

  const bar1LenN = typeof bar1Length === "number" ? bar1Length : 0;
  const bar1WN = typeof bar1Width === "number" ? bar1Width : widthN || 0;
  const bar1TN = typeof bar1Thk === "number" ? bar1Thk : 0;
  const bar2LenN = sameAsBar1
    ? bar1LenN
    : typeof bar2Length === "number"
      ? bar2Length
      : 0;
  const bar2WN = sameAsBar1
    ? bar1WN
    : typeof bar2Width === "number"
      ? bar2Width
      : widthN || 0;
  const bar2TN = sameAsBar1
    ? bar1TN
    : typeof bar2Thk === "number"
      ? bar2Thk
      : 0;

  const bar1Weight =
    barsMode === "include"
      ? (bar1LenN * bar1WN * bar1TN * AL_DENSITY) / 1_000_000
      : 0;
  const bar2Weight =
    barsMode === "include"
      ? (bar2LenN * bar2WN * bar2TN * AL_DENSITY) / 1_000_000
      : 0;

  const totalMaterialWeight =
    bar1Weight + stripWeight + sheetStackWeight + bar2Weight;
  const materialCost = totalMaterialWeight * 1.2 * matRate;
  const cuttingCost = sheetCount > 0 ? (sheetCount + 4) * 2.5 : 0;
  const foldingCost = 15;
  const chamferingCost = 80;
  const totalWeldLength = widthN > 0 && thkN > 0 ? (widthN + thkN) * 4 : 0;
  const labourRate = thkN > 0 ? interpolateLabourRate(thkN, labourRates) : 0;
  const weldingCost = widthN > 0 ? (widthN / 25) * labourRate : 0;

  const subtotal =
    materialCost + cuttingCost + foldingCost + chamferingCost + weldingCost;
  const overhead = subtotal * 0.05;
  const profit = subtotal * 0.1;
  const baseTotal = subtotal + overhead + profit;

  const hasResult = baseTotal > 0;

  // Markup so that after discount, customer pays ≈ baseTotal
  const markupFactor = discountPct > 0 ? 1 / (1 - discountPct / 100) : 1;

  const displayMaterialCost = materialCost * markupFactor;
  const displayCuttingCost = cuttingCost * markupFactor;
  const displayFoldingCost = foldingCost * markupFactor;
  const displayChamferingCost = chamferingCost * markupFactor;
  const displayWeldingCost = weldingCost * markupFactor;
  const displayOverhead = overhead * markupFactor;
  const displayProfit = profit * markupFactor;
  const quotedTotal = baseTotal * markupFactor;
  const discountAmount = quotedTotal * (discountPct / 100);
  const finalPrice = quotedTotal - discountAmount;
  const ratePerMeter =
    totalWeldLength > 0 ? finalPrice / (totalWeldLength / 1000) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card border-b border-border h-14 flex items-center justify-between px-4 md:px-6 shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Calculator size={14} className="text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground text-sm md:text-base">
            Flexibles Price Calculator
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {currentUser?.username}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={logout}
            data-ocid="customer.button"
          >
            <LogOut size={14} />
            Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 pb-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Bar mode toggle */}
          <Card className="border border-border shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Aluminium Flexible — Price Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Bar mode */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Bar Supply</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBarsMode("customer")}
                    className={`rounded-lg border-2 px-3 py-3 text-sm font-medium transition-all text-center ${
                      barsMode === "customer"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-border/80"
                    }`}
                    data-ocid="customer.toggle"
                  >
                    I&apos;m Supplying the Bars
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarsMode("include")}
                    className={`rounded-lg border-2 px-3 py-3 text-sm font-medium transition-all text-center ${
                      barsMode === "include"
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                        : "border-border bg-background text-muted-foreground hover:border-border/80"
                    }`}
                    data-ocid="customer.toggle"
                  >
                    Include Bars in Quote
                  </button>
                </div>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cust-width">Bunch Width (mm)</Label>
                  <Input
                    id="cust-width"
                    type="number"
                    min={0}
                    placeholder="e.g. 100"
                    value={bunchWidth}
                    onChange={(e) =>
                      setBunchWidth(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    data-ocid="customer.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cust-thk">Bunch Thickness (mm)</Label>
                  <Input
                    id="cust-thk"
                    type="number"
                    min={0}
                    placeholder="e.g. 10"
                    value={bunchThk}
                    onChange={(e) =>
                      setBunchThk(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    data-ocid="customer.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cust-len">Bunch Length / Center (mm)</Label>
                  <Input
                    id="cust-len"
                    type="number"
                    min={0}
                    placeholder="e.g. 100"
                    value={centerLength}
                    onChange={(e) =>
                      setCenterLength(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    data-ocid="customer.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Sheet Thickness</Label>
                  <Select
                    value={sheetThk}
                    onValueChange={(v) => setSheetThk(v as "0.28" | "0.3")}
                  >
                    <SelectTrigger data-ocid="customer.select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.3">0.3 mm</SelectItem>
                      <SelectItem value="0.28">0.28 mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bar inputs if include */}
              {barsMode === "include" && (
                <div className="space-y-4 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4 bg-amber-50/50 dark:bg-amber-900/10">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                    Bar Dimensions
                  </p>
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground font-medium">
                      Bar 1
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Length (mm)</Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="mm"
                          value={bar1Length}
                          onChange={(e) =>
                            setBar1Length(
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                            )
                          }
                          data-ocid="customer.input"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Width (mm)</Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder={String(widthN || "mm")}
                          value={bar1Width}
                          onChange={(e) =>
                            setBar1Width(
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                            )
                          }
                          data-ocid="customer.input"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Thickness (mm)</Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="mm"
                          value={bar1Thk}
                          onChange={(e) =>
                            setBar1Thk(
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                            )
                          }
                          data-ocid="customer.input"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground font-medium">
                        Bar 2
                      </p>
                      <button
                        type="button"
                        onClick={() => setSameAsBar1(!sameAsBar1)}
                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                          sameAsBar1
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "border-border text-muted-foreground hover:border-border/80"
                        }`}
                        data-ocid="customer.toggle"
                      >
                        {sameAsBar1 ? "Same as Bar 1" : "Different"}
                      </button>
                    </div>
                    {!sameAsBar1 && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Length (mm)</Label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="mm"
                            value={bar2Length}
                            onChange={(e) =>
                              setBar2Length(
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value),
                              )
                            }
                            data-ocid="customer.input"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Width (mm)</Label>
                          <Input
                            type="number"
                            min={0}
                            placeholder={String(widthN || "mm")}
                            value={bar2Width}
                            onChange={(e) =>
                              setBar2Width(
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value),
                              )
                            }
                            data-ocid="customer.input"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Thickness (mm)</Label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="mm"
                            value={bar2Thk}
                            onChange={(e) =>
                              setBar2Thk(
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value),
                              )
                            }
                            data-ocid="customer.input"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          {hasResult && (
            <Card
              className="border border-border shadow-card"
              data-ocid="customer.card"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Price Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Material Cost", value: displayMaterialCost },
                  { label: "Sheet Cutting", value: displayCuttingCost },
                  { label: "Folding", value: displayFoldingCost },
                  { label: "Chamfering", value: displayChamferingCost },
                  { label: "Welding", value: displayWeldingCost },
                  { label: "Overhead (5%)", value: displayOverhead },
                  { label: "Profit (10%)", value: displayProfit },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between items-center py-1.5 border-b border-border last:border-0"
                  >
                    <span className="text-sm text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-sm font-medium">
                      ₹{value.toFixed(2)}
                    </span>
                  </div>
                ))}

                {discountPct > 0 ? (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm font-semibold">Total</span>
                      <span className="text-sm font-semibold">
                        ₹{quotedTotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                        Discount ({discountPct}%)
                      </span>
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                        −₹{discountAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-base font-bold text-foreground">
                        Your Price
                      </span>
                      <span
                        className="text-xl font-bold text-primary"
                        data-ocid="customer.card"
                      >
                        ₹{finalPrice.toFixed(2)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center py-3">
                    <span className="text-base font-bold text-foreground">
                      Total Price
                    </span>
                    <span
                      className="text-xl font-bold text-primary"
                      data-ocid="customer.card"
                    >
                      ₹{baseTotal.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center py-2 bg-muted/50 rounded-lg px-3">
                  <span className="text-sm text-muted-foreground">
                    Rate per Meter
                  </span>
                  <span className="text-sm font-semibold">
                    {ratePerMeter > 0 ? `₹${ratePerMeter.toFixed(2)}/m` : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
