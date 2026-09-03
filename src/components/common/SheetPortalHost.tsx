import { View, StyleSheet } from "react-native";
import { useSheetStore } from "../../stores/sheetStore";
import { SheetRenderer } from "./CustomBottomSheet";

export default function SheetPortalHost() {
  const entries = useSheetStore((s) => s.entries);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {entries.map((entry) =>
        entry.standalone ? (
          <View
            key={entry.key}
            style={StyleSheet.absoluteFill}
            pointerEvents="box-none"
          >
            {entry.children}
          </View>
        ) : (
          <SheetRenderer
            key={entry.key}
            visible={entry.visible}
            onClose={entry.onClose}
          >
            {entry.children}
          </SheetRenderer>
        ),
      )}
    </View>
  );
}
