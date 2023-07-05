import * as FileSystem from "expo-file-system";


export default async function prepareFolder(localUri) {
    const folder = (segs => (segs.pop(), segs.join("/")))(localUri.split("/"));

    const info = await FileSystem.getInfoAsync(folder);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
    }
}
