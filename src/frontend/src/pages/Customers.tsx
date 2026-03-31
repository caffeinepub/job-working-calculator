import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Customer } from "../backend";
import {
  useAddCustomer,
  useCustomers,
  useDeleteCustomer,
  useUpdateCustomer,
} from "../hooks/useQueries";

type FormData = { name: string; phone: string; email: string; address: string };

const emptyForm: FormData = { name: "", phone: "", email: "", address: "" };

function CustomerDialog({
  customer,
  onClose,
}: {
  customer: Customer | null;
  onClose: () => void;
}) {
  const addMutation = useAddCustomer();
  const updateMutation = useUpdateCustomer();
  const [form, setForm] = useState<FormData>(
    customer
      ? {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
        }
      : emptyForm,
  );
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const isPending = addMutation.isPending || updateMutation.isPending;

  const validate = () => {
    const e: Partial<FormData> = {};
    if (!form.name.trim()) e.name = "Name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      if (customer) {
        await updateMutation.mutateAsync({ id: customer.id, ...form });
        toast.success("Customer updated");
      } else {
        await addMutation.mutateAsync(form);
        toast.success("Customer added");
      }
      onClose();
    } catch {
      toast.error("Failed to save customer");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-ocid="customers.dialog">
        <DialogHeader>
          <DialogTitle>
            {customer ? "Edit Customer" : "Add Customer"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cust-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cust-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Customer name"
              data-ocid="customers.name.input"
            />
            {errors.name && (
              <p
                className="text-xs text-destructive"
                data-ocid="customers.name_error"
              >
                {errors.name}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cust-phone">Phone</Label>
            <Input
              id="cust-phone"
              value={form.phone}
              onChange={(e) =>
                setForm((p) => ({ ...p, phone: e.target.value }))
              }
              placeholder="+91 99999 99999"
              data-ocid="customers.phone.input"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cust-email">Email</Label>
            <Input
              id="cust-email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="email@example.com"
              data-ocid="customers.email.input"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cust-address">Address</Label>
            <Input
              id="cust-address"
              value={form.address}
              onChange={(e) =>
                setForm((p) => ({ ...p, address: e.target.value }))
              }
              placeholder="Street, City, State"
              data-ocid="customers.address.input"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            data-ocid="customers.dialog.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            data-ocid="customers.dialog.submit_button"
          >
            {isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
            {customer ? "Update" : "Add Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Customers() {
  const { data: customers = [], isLoading } = useCustomers();
  const deleteCustomer = useDeleteCustomer();
  const [editingCustomer, setEditingCustomer] = useState<
    Customer | null | undefined
  >(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteCustomer.mutateAsync(deletingId);
      toast.success("Customer deleted");
    } catch {
      toast.error("Failed to delete customer");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6" data-ocid="customers.page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground border-l-4 border-rose-500 pl-3">
            Customers
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage your customer list
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => setEditingCustomer(null)}
          data-ocid="customers.add.primary_button"
        >
          <Plus size={15} />
          Add Customer
        </Button>
      </div>

      <Card className="shadow-card border-border">
        <CardContent className="pt-4 px-0">
          {isLoading ? (
            <div className="px-6 space-y-3" data-ocid="customers.loading_state">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 text-center"
              data-ocid="customers.empty_state"
            >
              <Users size={36} className="text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No customers yet</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                Add a customer to attach to jobs
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide pl-6">
                    Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Phone
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Email
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Address
                  </TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c, idx) => (
                  <TableRow
                    key={c.id}
                    className="border-b border-border/60 hover:bg-muted/20"
                    data-ocid={`customers.item.${idx + 1}`}
                  >
                    <TableCell className="pl-6 font-semibold text-sm">
                      {c.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.phone || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.email || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                      {c.address || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingCustomer(c)}
                          data-ocid={`customers.edit_button.${idx + 1}`}
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeletingId(c.id)}
                          disabled={deleteCustomer.isPending}
                          data-ocid={`customers.delete_button.${idx + 1}`}
                        >
                          {deleteCustomer.isPending && deletingId === c.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit dialog - editingCustomer=undefined means closed, null means adding new, object means editing */}
      {editingCustomer !== undefined && (
        <CustomerDialog
          customer={editingCustomer}
          onClose={() => setEditingCustomer(undefined)}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent data-ocid="customers.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the customer. Jobs linked to this
              customer will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="customers.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="customers.delete.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
