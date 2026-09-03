import { useCallback, useImperativeHandle, useState } from "react";
import type React from "react";

/**
 * Shared imperative open()/close() handle for modals that are controlled by
 * the parent through a ref instead of a `visible` prop. The optional `onOpen`
 * callback runs before the modal becomes visible (used to reset draft state).
 */
export function useModalHandle(
    ref: React.Ref<{ open: () => void }> | undefined,
    onOpen?: () => void,
) {
    const [visible, setVisible] = useState(false);

    const open = useCallback(() => {
        onOpen?.();
        setVisible(true);
    }, [onOpen]);

    const close = useCallback(() => setVisible(false), []);

    useImperativeHandle(ref, () => ({ open, close }));

    return { visible, open, close };
}
