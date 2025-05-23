module.exports={
    /**
     * {id:"historySummaryMessage",type:"apiMessage", message: summary}
     * @param {*} history 
     * @param {*} param1 
     * @returns 
     */
    updateHistoryMessageSummaryInHistory(history, {summary, removed}) {
        let currentSummaryIndex = history.findLastIndex(a => a.id == "historySummaryMessage")
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

        history.splice(currentSummaryIndex, 0, { id: "historySummaryMessage", type:"apiMessage", message: summary})
        return history
    },

    //<memory key hint>value</memory> -> (system, message:hint, value)
    updateMemoryFromMessageInHistory(message, history, replaceFx=m=>"") {
        const memoryRegex = /<memory\s+key="(?<key>[^"]+)"\s+hint="(?<hint>[^"]+)">(?<content>[\s\S]*?)<\/memory>/g;
    
        return message.message.replace(memoryRegex, (_, key, hint, content) => {
            const current={ type: "system", id: key, message: hint, value:content}
            const i = history.findIndex(a => a.type == "system" && a.id == key);
            if (i != -1) {
                history.splice(i, 1);
            }
            history.push(current);
            return replaceFx({key, hint, content});
        });
    },

    /**
     * keep id:"historySummaryMessage"
     * keep non-cache system message (system but no value)
     * @param {*} messages 
     */
    asPredictChatHistory(messages){
        return messages.map(({id,message,type})=>{
            if(type=="system" && !!message){
                return false
            }
            return {type, message, id}
        }).filter(a=>!!a)
    }
}