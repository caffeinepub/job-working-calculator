import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase } from "lucide-react";
import { useState } from "react";
import type { SavedJob } from "../backend";
import { JobCalculator } from "./JobCalculator";
import { JobHistory } from "./JobHistory";
import { RawMaterials } from "./RawMaterials";

type TabId = "rawMaterials" | "jobCalculator" | "jobHistory";

interface SSFabricationProps {
  editJobOnMount: SavedJob | null;
  onEditConsumed: () => void;
  initialTab?: TabId;
}

export function SSFabrication({
  editJobOnMount,
  onEditConsumed,
  initialTab,
}: SSFabricationProps) {
  const [activeTab, setActiveTab] = useState<TabId>(
    editJobOnMount ? "jobCalculator" : (initialTab ?? "rawMaterials"),
  );

  const handleEditJob = (savedJob: SavedJob) => {
    // Store the job and switch to calculator tab
    // We'll propagate via a local state trick - just navigate
    setActiveTab("jobCalculator");
    // The JobCalculator component manages editJobOnMount via the parent
    // We need to bubble up to App to set editingJob
    onEditConsumed(); // reset first
    // Re-trigger via window event or direct state — use a local ref approach
    // Actually let's hold the edit job locally
    setPendingEditJob(savedJob);
  };

  const [pendingEditJob, setPendingEditJob] = useState<SavedJob | null>(
    editJobOnMount,
  );

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabId);
  };

  return (
    <div className="flex flex-col gap-4" data-ocid="ss_fabrication.page">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Briefcase size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground border-l-4 border-amber-500 pl-3">
            SS Fabrication
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage raw materials, calculate job costs, and view history
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger
            value="rawMaterials"
            data-ocid="ss_fabrication.raw_materials.tab"
          >
            Raw Materials
          </TabsTrigger>
          <TabsTrigger
            value="jobCalculator"
            data-ocid="ss_fabrication.job_calculator.tab"
          >
            Job Calculator
          </TabsTrigger>
          <TabsTrigger
            value="jobHistory"
            data-ocid="ss_fabrication.job_history.tab"
          >
            Job History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rawMaterials" className="mt-0">
          <RawMaterials />
        </TabsContent>

        <TabsContent value="jobCalculator" className="mt-0">
          <JobCalculator
            editJobOnMount={pendingEditJob}
            onEditConsumed={() => {
              setPendingEditJob(null);
              onEditConsumed();
            }}
          />
        </TabsContent>

        <TabsContent value="jobHistory" className="mt-0">
          <JobHistory onEditJob={handleEditJob} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
