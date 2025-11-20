module.exports={
    /**
     * {id:"historySummaryMessage",type:"apiMessage", message: summary}
     * @param {*} history 
     * @param {*} param1 
     * @returns 
     */
    updateHistoryMessageSummaryInHistory(history, {summary, removed}) {
        const subchat={history:[], type:"summary"}
        let currentSummaryIndex = history.findLastIndex(a => a.id == "historySummaryMessage")
        if (currentSummaryIndex != -1) {
            subchat.history=history.splice(currentSummaryIndex, 1) // only 1 summary
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
                const [one]=history.splice(i, 1)
                subchat.history.push(one)
                removedCount++
            } else {
                i++
            }
        }

        history.splice(currentSummaryIndex, 0, { 
            id: "historySummaryMessage", 
            type:"apiMessage", 
            message: `<previous_conversation_summary>\n${summary}\n</previous_conversation_summary>`,
            subchat,
        })
        return history
    },

    //<memory key hint>value</memory> -> (system, message:hint, value)
    updateMemoryFromMessageInHistory(message, chat) {
        const memoryRegex = /<memory\s+key="(?<key>[^"]+)"\s+hint="(?<hint>[^"]*)">(?<content>[\s\S]*?)<\/memory>/g;
    
        return message.message.replace(memoryRegex, (_, key, hint, content) => {
            chat.memory[key]=content
            return "";
        });
    },

    /**
     * keep id:"historySummaryMessage"
     * keep non-cache system message (system but no value)
     * @param {*} messages 
     */
    asPredictChatHistory(messages, memoryKeys=[]){
        const history=messages.map(({id,message,type})=>{
            return {type, message, id}
        }).filter(a=>!!a)

        if(memoryKeys.length>0){
            const MemoryKeys=
                    `<memory_cache_keys>${memoryKeys.join(",")}</memory_cache_keys>
                    - You may use these memory caches when relevant.
                    - Only request or use keys listed above.
                    `;
            history[0]?.type==="system"?
                history[0].message+=`\n\n${MemoryKeys}`:
                history.unshift({type:"system", message:MemoryKeys})
        }

        return history
    }
}