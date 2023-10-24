
export function generateUUID(){
	const generateNumber = (limit) => {
		const value = limit * Math.random();
		return value | 0;
	}
	const generateX = () => {
		const value = generateNumber(16);
		return value.toString(16);
	}
	const generateXes = (count) => {
		let result = '';
		for(let i = 0; i < count; ++i) {
			result += generateX();
		}
		return result;
	}
	const generateconstant = () => {
		const value = generateNumber(16);
		const constant =  (value & 0x3) | 0x8;
		return constant.toString(16);
	}
		
	const generate = () => {
				const result = generateXes(8)
						+ '-' + generateXes(4)
						+ '-' + '4' + generateXes(3)
						+ '-' + generateconstant() + generateXes(3)
						+ '-' + generateXes(12)
				return result;
	};
	return generate()
}

function escapeRegExp(string) {
    // The $& at the end means the whole matched string
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), "g"), replace);
}

export function parse(data) {
    const chunks = data.split("data: ");
    const sanitizedChunks = chunks
        .map((c) => replaceAll(c, "\n", ""))
        .filter((c) => !!c && c !== "[DONE]");
    if (!sanitizedChunks.length) {
        return null;
    }
    for (let i = sanitizedChunks.length - 1; i > -1; i--) {
        try {
            const response = JSON.parse(sanitizedChunks[i]);
            return {
                message: response.message.content.parts[0],
                messageId: response.message.id,
                conversationId: response.conversation_id,
                isDone: response.message?.end_turn === true,
            };
        } catch (e) { }
    }
}

export function checkStatus(res){
	let reason=""
	if (res.status >= 400 && res.status < 500) {
		if (res.status === 401) {
		  // Token expired, notifying
		 	reason="TokenExpired"
		} else if (res.status === 403) {
		  // Session expired, reloading Web View
			reason="SessionExpired"
		}
	} else if (res.status >= 500) {
		reason=res.statusText
	}
	if(reason)
		throw new Error(reason)
}

export async function* asAsyncIterable(response) {
	checkStatus(response)

    if(response.body){
        const reader = response.body.getReader()
        try {
            while (true) {
                const { done, value } = await reader.read()
                if (done) {
                    return
                }
                yield new TextDecoder().decode(value)
            }
        } finally {
            reader.releaseLock()
        }
    }else{
        yield await response.text()
    }
}