
export function render(template, inputValues) {
    const nodes = parse(template);
    const $=v=>typeof(v)=="object" ? JSON.stringify(v) : v
    return nodes.reduce((res, node) => {
        if (node.type === "variable") {
            if (node.name in inputValues) {
                return res + $(inputValues[node.name]);
            }
            throw new Error(`Missing value for input ${node.name}`);
        }
        return res + node.text;
    }, "");
}

export function parse(template) {
    const chars = template.split("");
    const nodes = [];

    function nextBracket(bracket, start) {
        for (let i = start; i < chars.length; i++) {
            if (bracket.includes(chars[i])) {
                return i;
            }
        }
        return -1;
    }

    let i = 0;
    while (i < chars.length) {
        if (chars[i] === "{" && i + 1 < chars.length && chars[i + 1] === "{") {
            nodes.push({ type: "literal", text: "{" });
            i += 2;
        } else if (chars[i] === "}" && i + 1 < chars.length && chars[i + 1] === "}") {
            nodes.push({ type: "literal", text: "}" });
            i += 2;
        } else if (chars[i] === "{") {
            const j = nextBracket("}", i);
            if (j < 0) {
                throw new Error("Unclosed '{' in template.");
            }
            nodes.push({ type: "variable", name: chars.slice(i + 1, j).join("") });
            i = j + 1;
        } else if (chars[i] === "}") {
            throw new Error("Single '}' in template.");
        } else {
            const next = nextBracket("{}", i);
            const text = (next < 0 ? chars.slice(i) : chars.slice(i, next)).join("");
            nodes.push({ type: "literal", text });
            i = next < 0 ? chars.length : next;
        }
    }
    return nodes;
}