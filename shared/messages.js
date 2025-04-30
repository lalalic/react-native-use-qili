module.exports={
    updateHistoryMessageSummaryInHistory(history, {summary, removed}) {
        let currentSummaryIndex = history.findLastIndex(a => a.type == "historySummaryMessage")
        if (currentSummaryIndex != -1) {
            history.splice(currentSummaryIndex, 1) // only 1 summary
        } else {
            currentSummaryIndex = 0
        }

        // Delete all type!="system" messages prior to currentSummaryIndex
        for (let i = currentSummaryIndex - 1; i >= 0; i--) {
            if (history[i].type !== "system") {
                history.splice(i, 1)
                currentSummaryIndex--
            }
        }

        // Delete removed number of type!="system" messages from currentSummaryIndex
        let removedCount = 0
        for (let i = currentSummaryIndex; i < history.length && removedCount < removed; ) {
            if (history[i].type !== "system") {
                history.splice(i, 1)
                removedCount++
            } else {
                i++
            }
        }

        history.splice(currentSummaryIndex, 0, { id: Date.now(), type: "historySummaryMessage", message: summary })
        return history
    }
}