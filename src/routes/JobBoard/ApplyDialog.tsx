import { useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogActions,
  DialogDescription,
  DialogTitle,
} from "../../components/ui/dialog";
import { useAuth } from "../../providers/AuthProvider";

const API = "http://localhost:4000/api";

interface IApplyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
}

const ApplyDialog = (props: IApplyDialogProps) => {
  const { isOpen, onClose, jobId } = props;
  const { isLoggedIn } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    setLoading(true);
    try {
      await fetch(`${API}/jobs/${jobId}/apply`, {
        method: "POST",
        credentials: "include",
      });
      onClose();
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>Apply for role</DialogTitle>
      {isLoggedIn ? (
        <>
          <DialogDescription>
            Confirm you would like to apply for this role.
          </DialogDescription>
          <DialogActions>
            <Button plain onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply} loading={loading}>
              Apply
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogDescription>
            Please login or create an account to apply for this role.
          </DialogDescription>
          <DialogActions>
            <Button onClick={onClose}>Close</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default ApplyDialog;
