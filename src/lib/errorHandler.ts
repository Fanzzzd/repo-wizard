import React from "react";
import { useDialogStore } from "../store/dialogStore";
import { AppError } from "./error";

export function showErrorDialog(error: unknown) {
  const { open } = useDialogStore.getState();

  let title = "An Error Occurred";
  let message: string;

  if (error instanceof AppError) {
    // AppError is designed to have a user-friendly message.
    title = error.message;
    message = error.originalError
      ? `Details: ${String(error.originalError)}`
      : "No further details available.";
  } else if (error instanceof Error) {
    title = error.name;
    message = error.message;
  } else {
    title = "Unexpected Error";
    message = String(error);
  }

  open({
    title,
    content: React.createElement(
      "pre",
      { className: "text-sm whitespace-pre-wrap font-mono" },
      message
    ),
    status: "error",
    type: "alert",
  });
}