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
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  itemName?: string;
};

export function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  isDeleting,
  itemName,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent data-ocid="delete.dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Raw Material</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <strong>{itemName ?? "this item"}</strong>? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} data-ocid="delete.cancel_button">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-ocid="delete.confirm_button"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
