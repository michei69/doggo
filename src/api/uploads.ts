import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { uploadFile } from "./profile";

export type PickAndUploadAvatarResult =
    | { status: "denied" }
    | { status: "cancelled" }
    | { status: "uploaded"; filename: string };

export async function pickAndUploadAvatar(
    uploadType: string,
    fileName: string,
    onManipulated?: () => void,
): Promise<PickAndUploadAvatarResult> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { status: "denied" };
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return { status: "cancelled" };

    const manipResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 256, height: 256 } }],
        { format: ImageManipulator.SaveFormat.WEBP, compress: 0.85 },
    );

    onManipulated?.();

    const upload = await uploadFile("webp", uploadType);

    await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", upload.url);
        xhr.setRequestHeader("Content-Type", "image/webp");
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`HTTP ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send({
            uri: manipResult.uri,
            type: "image/webp",
            name: fileName,
        } as any);
    });

    return { status: "uploaded", filename: upload.filename };
}
