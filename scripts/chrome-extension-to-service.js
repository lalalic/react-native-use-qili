function mergeServices(dirChromeExtension=`${process.cwd()}/chrome-extension`) {
	const fs = require('fs');
	const codes = [];
	const uris = require(`${dirChromeExtension}/manifest.json`)
		.content_scripts
		.reduce((uris, a) => {
			const name = a.js[0].replace(".js", "").split("/").pop();
			uris.push(`${name} : "${a.matches[0]}"`);
			const code = fs.readFileSync(`${dirChromeExtension}/${a.js[0]}`, { encoding: "utf8" })
				.replace("function", `exports.${name}=function`)
			codes.push(code);
			return uris;
		}, []);

	const services = [];
	fs.readdirSync(`${dirChromeExtension}/services`, { encoding: 'utf8' })
		.forEach(a => {
			const [name] = a.split(".");
			const code = fs.readFileSync(`${dirChromeExtension}/services/${a}`, { encoding: "utf8" });
			codes.push(code);
			services.push(name);
		});

	fs.writeFileSync(`${dirChromeExtension}/index.js`, `
			${codes.join("\n")}
			exports.uris={
				${uris.join(",\n")}
			}
			exports.services={
				${services.join(",\n")}
			}

			exports.subscriptAsHelper=function({helper, chrome, window, Qili}){
				${fs.readFileSync(`${dirChromeExtension}/background.js`)}
				return unsub
			}
		`);
	console.log(`done: ${dirChromeExtension}/index.js`)
}

if(require.main){
	let [,,target="../bridge-chrome-extension"]=process.argv
	target=require('path').resolve(__dirname, target)
	mergeServices(target)
}

module.exports=mergeServices