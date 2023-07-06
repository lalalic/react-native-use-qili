export default function mergeServices(dirChromeExtension=`${process.cwd()}/chrome-extension`) {
	const fs = require('fs');
	const codes = [];
	const uris = require(`${dirChromeExtension}/manifest.json`)
		.content_scripts
		.reduce((uris, a) => {
			const name = a.js[0].replace(".js", "").split("/").pop();
			uris.push(`${name} : "${a.matches[0]}"`);
			const code = fs.readFileSync(`./chrome-extension/${a.js[0]}`, { encoding: "utf8" })
				.replace("function", "export function")
				.replace("injectBro", name);
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
			export const uris={
				${uris.join(",\n")}
			}
			export const services={
				${services.join(",\n")}
			}

			export function subscriptAsHelper({helper, chrome, window, Qili}){
				${fs.readFileSync(`${dirChromeExtension}/background.js`)}
			}
		`);
}