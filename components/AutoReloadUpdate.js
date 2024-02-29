import React from "react";
import * as Updates from "expo-updates";
import { alert } from "./Prompt";
const l10n=globalThis.l10n

export default function AutoReloadUpdate({autoReloadUpdate=true}) {
    React.useEffect(() => {
        async function update() {
            await Updates.fetchUpdateAsync();
            if (autoReloadUpdate ||
                (await alert({
                    title: l10n["Update"],
                    message: l10n[`There's an update, do you want to reload?`],
                }))) {
                await Updates.reloadAsync();
            }
        }
        ; (async () => {
            const { isAvailable } = await Updates.checkForUpdateAsync();
            if (isAvailable) {
                await update();
            }
            Updates.addListener(event => {
                if (event.type === Updates.UpdateEventType.UPDATE_AVAILABLE) {
                    update();
                }
            });
        })();
    }, []);
}
