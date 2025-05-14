module.exports=token=>({
    name:"upload built-in chatflows",
    async init(qili){
        if(typeof(token)=="function"){
            token=token(qili)
        }
        if(!token){
            console.error(`No token to upload chatflows`)
            return 
        }
        const fs = require('fs');
        const path = require('path');

        function loadChatflows(dir) {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            return files.flatMap(file => {
            const fullPath = path.join(dir, file.name);
            if (file.isDirectory()) {
                return loadChatflows(fullPath);
            } else if (file.isFile() && (file.name.endsWith('.js') || file.name.endsWith('.json'))) {
                return require(fullPath);
            }
            return [];
            });
        }

        const chatflows = loadChatflows(path.join(path.dirname(require.resolve(".")), 'chatflows'));

        if(chatflows.length==0){
            return 
        }
        const failed=[], success=[]
        for (const chatflow of chatflows) {
            const {error}=await fetch("https://ai.qili2.com/graphql",{
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    "x-application-id": "ai",
                    "x-access-token":token
                },
                body:JSON.stringify({
                    query:`mutation($chatflow:JSON!){
                        error:upload_chatflow(chatflow: $chatfloat)
                    }`,
                    variables:chatflow,
                })
            })

            if(error){
                failed.push(error)
            }else{
                success.push(chatflow.name)
            }
        }
        console.info(`built-int chatflows: [${chatflows.length}] found. **********`)
        if(success.length){
            console.debug(success)
        }
        if(failed.length){
            console.error(failed)
        }
    }
})