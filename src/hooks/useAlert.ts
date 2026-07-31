import { useCallback, useState } from "react";
import type { AlertButton } from "../components/common/CustomAlert";

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
}

export function useAlert() {
  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
    buttons: [],
  });

  const showAlert = useCallback(
    (title: string, message: string, buttons: AlertButton[]) => {
      setAlert({ visible: true, title, message, buttons });
    },
    [],
  );

  const dismissAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, visible: false }));
  }, []);

  return { alert, showAlert, dismissAlert };
}
