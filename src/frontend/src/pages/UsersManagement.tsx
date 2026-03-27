import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Check,
  Loader2,
  RefreshCw,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { type AppUser, getAuthActor } from "../authActor";

function statusBadge(status: string) {
  if (status === "approved")
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0">
        Approved
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-0">
        Rejected
      </Badge>
    );
  return (
    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-0">
      Pending
    </Badge>
  );
}

function roleBadge(role: string) {
  if (role === "admin")
    return (
      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-0">
        Admin
      </Badge>
    );
  return <Badge variant="outline">Customer</Badge>;
}

export function UsersManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [discountInputs, setDiscountInputs] = useState<Record<string, string>>(
    {},
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [acting, setActing] = useState<Record<string, boolean>>({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const actor = await getAuthActor();
      const list = await actor.getUsers();
      setUsers(list);
      const inputs: Record<string, string> = {};
      for (const u of list) {
        inputs[u.id] = String(u.discountPct);
      }
      setDiscountInputs(inputs);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // biome-ignore lint/correctness/useExhaustiveDependencies: initial load only
  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (id: string) => {
    setActing((p) => ({ ...p, [id]: true }));
    try {
      const actor = await getAuthActor();
      await actor.approveUser(id);
      toast.success("User approved");
      await fetchUsers();
    } catch {
      toast.error("Failed to approve user");
    } finally {
      setActing((p) => ({ ...p, [id]: false }));
    }
  };

  const handleReject = async (id: string) => {
    setActing((p) => ({ ...p, [id]: true }));
    try {
      const actor = await getAuthActor();
      await actor.rejectUser(id);
      toast.success("User rejected");
      await fetchUsers();
    } catch {
      toast.error("Failed to reject user");
    } finally {
      setActing((p) => ({ ...p, [id]: false }));
    }
  };

  const handleDelete = async (id: string) => {
    setActing((p) => ({ ...p, [id]: true }));
    try {
      const actor = await getAuthActor();
      await actor.deleteUser(id);
      toast.success("User deleted");
      await fetchUsers();
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setActing((p) => ({ ...p, [id]: false }));
    }
  };

  const handleSaveDiscount = async (id: string) => {
    const pct = Number(discountInputs[id] ?? "0");
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("Discount must be between 0 and 100");
      return;
    }
    setSaving((p) => ({ ...p, [id]: true }));
    try {
      const actor = await getAuthActor();
      await actor.updateUserDiscount(id, pct);
      toast.success("Discount updated");
      await fetchUsers();
    } catch {
      toast.error("Failed to update discount");
    } finally {
      setSaving((p) => ({ ...p, [id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <UserCheck size={18} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              User Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Approve registrations and assign discounts
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchUsers}
          disabled={loading}
          data-ocid="users.button"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span className="ml-1.5">Refresh</span>
        </Button>
      </div>

      <Card className="border border-border shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Registered Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div
              className="flex items-center justify-center py-16 gap-2 text-muted-foreground"
              data-ocid="users.loading_state"
            >
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Loading users…</span>
            </div>
          ) : users.length === 0 ? (
            <div
              className="text-center py-16 text-muted-foreground"
              data-ocid="users.empty_state"
            >
              <UserCheck size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No registered users yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="users.table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Discount %</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, idx) => (
                    <TableRow key={user.id} data-ocid={`users.item.${idx + 1}`}>
                      <TableCell className="font-medium">
                        {user.username}
                      </TableCell>
                      <TableCell>{roleBadge(user.role)}</TableCell>
                      <TableCell>{statusBadge(user.status)}</TableCell>
                      <TableCell className="text-right">
                        {user.role !== "admin" && user.status === "approved" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              className="w-20 h-7 text-right text-sm"
                              value={discountInputs[user.id] ?? "0"}
                              onChange={(e) =>
                                setDiscountInputs((p) => ({
                                  ...p,
                                  [user.id]: e.target.value,
                                }))
                              }
                              data-ocid="users.input"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleSaveDiscount(user.id)}
                              disabled={saving[user.id]}
                              data-ocid="users.save_button"
                            >
                              {saving[user.id] ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Check size={12} />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {user.role === "admin"
                              ? "—"
                              : `${user.discountPct}%`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role === "admin" ? (
                          <span className="text-xs text-muted-foreground italic">
                            Owner
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {user.status !== "approved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 gap-1 text-xs text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
                                onClick={() => handleApprove(user.id)}
                                disabled={acting[user.id]}
                                data-ocid="users.confirm_button"
                              >
                                {acting[user.id] ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <UserCheck size={12} />
                                )}
                                Approve
                              </Button>
                            )}
                            {user.status !== "rejected" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => handleReject(user.id)}
                                disabled={acting[user.id]}
                                data-ocid="users.cancel_button"
                              >
                                {acting[user.id] ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <UserX size={12} />
                                )}
                                Reject
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(user.id)}
                              disabled={acting[user.id]}
                              data-ocid="users.delete_button"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
