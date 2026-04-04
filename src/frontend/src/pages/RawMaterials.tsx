import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Clock,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { RawMaterial } from "../backend";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { MaterialModal } from "../components/MaterialModal";
import {
  useAddMaterial,
  useDeleteMaterial,
  useDeleteRateHistoryEntry,
  useMaterials,
  useUpdateMaterial,
} from "../hooks/useQueries";
import { MATERIAL_TYPES, isWireMesh } from "../utils/weightCalculator";

type SortKey = keyof Pick<
  RawMaterial,
  "grade" | "materialType" | "size" | "weightPerMeter" | "currentRate"
>;
type SortDir = "asc" | "desc";

const TYPE_COLORS: Record<string, string> = {
  "Round Bar": "bg-blue-100 text-blue-700",
  "Flat Bar": "bg-emerald-100 text-emerald-700",
  "Square Bar": "bg-violet-100 text-violet-700",
  Pipe: "bg-amber-100 text-amber-700",
  Angle: "bg-orange-100 text-orange-700",
  "Channel (ISMC)": "bg-cyan-100 text-cyan-700",
  "I-Beam (ISMB)": "bg-pink-100 text-pink-700",
  Plate: "bg-slate-100 text-slate-700",
  Sheet: "bg-teal-100 text-teal-700",
  "Wire Mesh": "bg-rose-100 text-rose-700",
};

const SKELETON_IDS = ["sk1", "sk2", "sk3", "sk4", "sk5"];

const SAMPLE_MATERIALS: Omit<RawMaterial, "id" | "createdAt">[] = [
  {
    grade: "IS 2062",
    materialType: "Round Bar",
    size: "20 mm",
    weightPerMeter: 2.466,
    currentRate: 68.5,
    rateHistory: [],
  },
  {
    grade: "IS 2062",
    materialType: "Flat Bar",
    size: "50x6 mm",
    weightPerMeter: 2.355,
    currentRate: 66.0,
    rateHistory: [],
  },
  {
    grade: "IS 1239",
    materialType: "Pipe",
    size: "60.3x3.6 mm",
    weightPerMeter: 5.03,
    currentRate: 72.0,
    rateHistory: [],
  },
  {
    grade: "IS 2062",
    materialType: "Angle",
    size: "65x65x6 mm",
    weightPerMeter: 5.8,
    currentRate: 67.5,
    rateHistory: [],
  },
  {
    grade: "ASTM A36",
    materialType: "I-Beam (ISMB)",
    size: "200 mm",
    weightPerMeter: 25.4,
    currentRate: 74.0,
    rateHistory: [],
  },
  {
    grade: "IS 2062",
    materialType: "Square Bar",
    size: "25 mm",
    weightPerMeter: 4.906,
    currentRate: 65.0,
    rateHistory: [],
  },
];

const SAMPLE_WITH_IDS = SAMPLE_MATERIALS.map((m, i) => ({
  ...m,
  id: `sample-${i}`,
  createdAt: BigInt(0),
}));

function formatHistoryDate(changedAt: bigint) {
  const ms = Number(changedAt) / 1_000_000;
  if (ms === 0) return "—";
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function RawMaterials() {
  const { data: materials = [], isLoading, isError } = useMaterials();
  const addMutation = useAddMaterial();
  const updateMutation = useUpdateMaterial();
  const deleteMutation = useDeleteMaterial();
  const deleteHistoryMutation = useDeleteRateHistoryEntry();

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<RawMaterial | null>(null);
  const [deleteItem, setDeleteItem] = useState<RawMaterial | null>(null);
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("grade");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Set<string>>(
    new Set(),
  );

  const isSampleData = materials.length === 0;
  const displayData = !isSampleData ? materials : SAMPLE_WITH_IDS;

  const grades = useMemo(
    () => Array.from(new Set(displayData.map((m) => m.grade))).sort(),
    [displayData],
  );

  const filtered = useMemo(() => {
    let data = [...displayData];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (m) =>
          m.grade.toLowerCase().includes(q) ||
          m.materialType.toLowerCase().includes(q) ||
          m.size.toLowerCase().includes(q),
      );
    }
    if (filterGrade !== "all")
      data = data.filter((m) => m.grade === filterGrade);
    if (filterType !== "all")
      data = data.filter((m) => m.materialType === filterType);

    data.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return data;
  }, [displayData, search, filterGrade, filterType, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleHistory = (id: string) => {
    setExpandedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col)
      return (
        <ArrowUpDown
          size={13}
          className="ml-1 text-muted-foreground opacity-50"
        />
      );
    return sortDir === "asc" ? (
      <ArrowUp size={13} className="ml-1 text-primary" />
    ) : (
      <ArrowDown size={13} className="ml-1 text-primary" />
    );
  };

  const handleSave = async (data: {
    grade: string;
    materialType: string;
    size: string;
    weightPerMeter: number;
    currentRate: number;
  }) => {
    try {
      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem.id, ...data });
        toast.success("Material updated successfully");
      } else {
        await addMutation.mutateAsync(data);
        toast.success("Material added successfully");
      }
      setModalOpen(false);
      setEditItem(null);
    } catch (err) {
      console.error("Failed to save material:", err);
      toast.error("Failed to save material");
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await deleteMutation.mutateAsync(deleteItem.id);
      toast.success("Material deleted");
      setDeleteItem(null);
    } catch (err) {
      console.error("Failed to delete material:", err);
      toast.error("Failed to delete material");
    }
  };

  const handleDeleteHistory = async (materialId: string, index: number) => {
    try {
      await deleteHistoryMutation.mutateAsync({
        materialId,
        index: BigInt(index),
      });
      toast.success("Rate history entry deleted");
    } catch (err) {
      console.error("Failed to delete history entry:", err);
      toast.error("Failed to delete history entry");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground border-l-4 border-amber-500 pl-3">
            Raw Material Manager
          </h1>
          <nav className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
            <span>Home</span>
            <span>/</span>
            <span className="text-foreground font-medium">Raw Materials</span>
          </nav>
        </div>
        <Button
          onClick={() => {
            setEditItem(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2"
          data-ocid="material.open_modal_button"
        >
          <Plus size={16} />
          Add New Material
        </Button>
      </div>

      {/* Sample data banner */}
      {isSampleData && !isLoading && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-900">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 shrink-0">⚠️</span>
            <p className="text-sm font-medium">
              You're viewing sample data. Add your first material to get
              started.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditItem(null);
              setModalOpen(true);
            }}
            className="shrink-0 text-xs font-semibold bg-amber-600 text-white px-3 py-1.5 rounded-md hover:bg-amber-700 transition-colors"
            data-ocid="material.sample_banner.button"
          >
            Add Material
          </button>
        </div>
      )}

      {/* Main card */}
      <div className="bg-card rounded-lg shadow-card border border-border">
        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground border-l-4 border-amber-400 pl-2">
              Material Inventory
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <div className="relative flex-1 min-w-48">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search grade, type, size…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
              data-ocid="material.search_input"
            />
          </div>
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger
              className="w-40 h-9 text-sm"
              data-ocid="material.grade_filter.select"
            >
              <SelectValue placeholder="All Grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {grades.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger
              className="w-44 h-9 text-sm"
              data-ocid="material.type_filter.select"
            >
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {MATERIAL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3" data-ocid="material.loading_state">
              {SKELETON_IDS.map((id) => (
                <Skeleton key={id} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              data-ocid="material.error_state"
            >
              <p className="text-sm text-destructive font-medium">
                Failed to load materials
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please try refreshing the page
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  {(
                    [
                      ["grade", "Grade"],
                      ["materialType", "Type"],
                      ["size", "Size"],
                      ["weightPerMeter", "Weight/Unit"],
                      ["currentRate", "Rate"],
                    ] as [SortKey, string][]
                  ).map(([key, label]) => (
                    <TableHead
                      key={key}
                      className="text-xs font-semibold uppercase tracking-wide cursor-pointer select-none hover:text-foreground"
                      onClick={() => handleSort(key)}
                      data-ocid={`material.${key}.tab`}
                    >
                      <span className="flex items-center">
                        {label}
                        <SortIcon col={key} />
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div
                          className="flex flex-col items-center justify-center py-14"
                          data-ocid="material.empty_state"
                        >
                          <Package
                            size={40}
                            className="text-muted-foreground/30 mb-3"
                          />
                          <p className="text-sm font-medium text-muted-foreground">
                            No materials found
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            Try adjusting your filters or add a new material
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((m, idx) => (
                      <>
                        <motion.tr
                          key={m.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15, delay: idx * 0.02 }}
                          className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                          data-ocid={`material.item.${idx + 1}`}
                        >
                          <TableCell className="text-sm font-medium">
                            {m.grade}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={`text-xs font-medium rounded-full px-2.5 py-0.5 border-0 ${
                                TYPE_COLORS[m.materialType] ?? ""
                              }`}
                            >
                              {m.materialType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {m.size}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {m.weightPerMeter.toFixed(3)}{" "}
                            <span className="text-xs text-muted-foreground">
                              {isWireMesh(m.materialType) ? "kg/sqft" : "kg/m"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            ₹{m.currentRate.toFixed(2)}{" "}
                            <span className="text-xs text-muted-foreground">
                              {isWireMesh(m.materialType) ? "/sqft" : "/kg"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 transition-colors ${
                                  expandedHistoryIds.has(m.id)
                                    ? "text-primary bg-primary/10"
                                    : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                                }`}
                                onClick={() => toggleHistory(m.id)}
                                title="Rate History"
                                data-ocid={`material.history.toggle.${idx + 1}`}
                              >
                                <Clock size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => {
                                  setEditItem(m);
                                  setModalOpen(true);
                                }}
                                data-ocid={`material.edit_button.${idx + 1}`}
                              >
                                <Pencil size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteItem(m)}
                                data-ocid={`material.delete_button.${idx + 1}`}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                        {expandedHistoryIds.has(m.id) && (
                          <tr
                            key={`history-${m.id}`}
                            className="bg-muted/20 border-b border-border/40"
                          >
                            <td colSpan={6} className="px-6 py-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock
                                  size={13}
                                  className="text-muted-foreground"
                                />
                                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Rate History — {m.grade} {m.materialType}{" "}
                                  {m.size}
                                </span>
                              </div>
                              {m.rateHistory.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic pl-1">
                                  No rate history yet.
                                </p>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  {m.rateHistory.map((entry, histIdx) => (
                                    <div
                                      key={`${entry.rate}-${String(entry.changedAt)}`}
                                      className="flex items-center justify-between rounded-md bg-background border border-border/60 px-3 py-1.5"
                                    >
                                      <div className="flex items-center gap-4">
                                        <span className="text-xs font-mono font-semibold">
                                          ₹{entry.rate.toFixed(2)}/kg
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {formatHistoryDate(entry.changedAt)}
                                        </span>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                        onClick={() =>
                                          handleDeleteHistory(m.id, histIdx)
                                        }
                                        disabled={
                                          deleteHistoryMutation.isPending
                                        }
                                        data-ocid={`material.history.delete_button.${histIdx + 1}`}
                                      >
                                        <Trash2 size={11} />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Modals */}
      <MaterialModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditItem(null);
        }}
        onSave={handleSave}
        editItem={editItem}
        isSaving={addMutation.isPending || updateMutation.isPending}
      />
      <DeleteConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
        itemName={
          deleteItem
            ? `${deleteItem.grade} ${deleteItem.materialType} ${deleteItem.size}`
            : undefined
        }
      />
    </div>
  );
}
