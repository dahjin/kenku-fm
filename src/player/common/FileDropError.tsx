import React from "react";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

export function FileDropError({
  error,
  onClose,
}: {
  error: string | null;
  onClose: () => void;
}) {
  return (
    <Snackbar
      open={Boolean(error)}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      <Alert severity="error" onClose={onClose}>
        {error}
      </Alert>
    </Snackbar>
  );
}
