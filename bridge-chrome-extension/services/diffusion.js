function diffusion(){
    const session_hash=Math.random().toString(36).substring(2)
    const hash={session_hash,fn_index: 2}
    return {
        generate(prompt){
            const session_hash=Math.random().toString(36).substring(2)
            const hash={session_hash,fn_index: 2}
            return new Promise((resolve,reject)=>{
                const ws=new WebSocket("wss://runwayml-stable-diffusion-v1-5.hf.space/queue/join")
                ws.onmessage=function(event){
                    const {msg, output} = JSON.parse(event.data);
                    switch (msg) {
                    case "send_data":
                        ws.send(JSON.stringify({
                            ...hash,
                            data:[prompt],
                        }))
                        break;
                    case "send_hash":
                        ws.send(JSON.stringify(hash));
                        break;
                    case "process_completed":
                        resolve(output.data[0])
                        return;
                    case "queue_full":
                        return;
                    case "estimation":
                        break;
                    case "process_generating":
                        break;
                    case "process_starts":
                        break
                    }
                }
            })
        },

        tts(prompt){
            const session_hash=Math.random().toString(36).substring(2)
            const hash={session_hash,fn_index: 3}
            return new Promise((resolve,reject)=>{
                const ws=new WebSocket("wss://coqui-voice-chat-with-mistral.hf.space/queue/join")
                ws.onmessage=function(event){
                    const {msg, output} = JSON.parse(event.data);
                    switch (msg) {
                    case "send_data":
                        ws.send(JSON.stringify({
                            ...hash,
                            data:[prompt],
                        }))
                        break;
                    case "send_hash":
                        ws.send(JSON.stringify(hash));
                        break;
                    case "process_completed":
                        resolve(output.data[0])
                        return;
                    case "queue_full":
                        return;
                    case "estimation":
                        break;
                    case "process_generating":
                        break;
                    case "process_starts":
                        break
                    }
                }
            })
        },

        async dalle(prompt,{size="1024x1024", openApiKey=OPENAI_API_KEY}={}){
            const res=await fetch("https://api.openai.com/v1/images/generations",{
                method:"POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + openApiKey,
                },
                body:JSON.stringify({
                    prompt,
                    n:1,
                    size
                })
            })
            try{
                const data=await res.json()
                const {data:[{url}]} = data
                return {message:url, tokens: 100}
            }catch(e){
                return {message:"error: "+e.message, tokens: 1}
            }
        }
    }
}

diffusion.accessible="https://runwayml-stable-diffusion-v1-5.hf.space/"