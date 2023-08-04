const puppeteer = require("puppeteer-extra")
const path = require("path");

(async () => {
	puppeteer.use(require("puppeteer-extra-plugin-stealth")());
	
	const pathToExtension = path.resolve(__dirname, "..");
	const browser = await puppeteer.launch({
		executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		userDataDir:"./userData",
		headless: false,
		args:['--app']
	});
	

	const [chat]=await browser.pages()
	await chat.goto("https://chat.openai.com");
	const server=await browser.newPage()
	
	await (async function injectBro(){
		await chat.evaluate(()=>{
			let unsubscribe
			const empty=()=>({})
			const proxy=new Proxy({},{get:(_,key)=>empty})
			return Object.assign(chrome,{
				tabs:proxy,
				browserAction:proxy,
				storage:{
					sync:{
						get(key, callback){
							callback?.(this[key])
						},
						set(value){
							Object.assign(this, value)
							console.log(value)
						}
					}
				},
				runtime:{
					onMessage:proxy,
					onStartup:proxy,
					onInstalled:proxy,
					onSuspend:{
						addListener(unsub){
							unsubscribe=unsub
						}
					}
				}
			})
		})
		const {background:{scripts}}=require(`${pathToExtension}/manifest.json`)
		for(let script of scripts){
			await chat.addScriptTag({path:`${pathToExtension}/${script}`})
		}
		await chat.evaluate(()=>{
			const div=document.createElement('div')
			div.style="position:absolute;width:50px;height:50px;background:green;top:10px;right:10px"
			document.body.appendChild(div)
			div.innerHTML="Qili2"
		})
	})();
	console.log(`${globalThis.helper} is running in browser with openai web and fallback to API`)

	const {data, url}=require("./server")
	await server.goto(url)
	data.on('change',storage=>{
		console.log(storage)
	})
	console.log(`${globalThis.helper}-sister is running in console only with openai API`)
})();
