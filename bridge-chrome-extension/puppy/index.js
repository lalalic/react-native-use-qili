const puppeteer = require("puppeteer-extra")
const path = require("path")

async function serverAI(chat, browser){
	try{
		const url="https://www.bing.com/chat"
		await chat.goto(url)

		await (async ()=>{
			return new Promise(async function test(resolve){
				const cookie=await chat.evaluate(()=>document.cookie)
				if(cookie.indexOf("; ANON=")!=-1){
					globalThis.getBingAICookie=()=>cookie
					
					if(cookie){
						console.log(`BingAI is ready : ${cookie}`)
						resolve()
					}
				}else{
					console.warn(`Bing need login`)
					await chat.evaluate(()=>alert(`Please login bing to continue`))
					chat.once("requestfinished",req=>{
						if(req.url()==`https://www.bing.com/search`){
							test(resolve)
						}
					})
				}
			})
		})();
		

		const {data}=require("./server")
		
		data.on('change',storage=>{
			chat.$('#server').innerHTML="Server Info: "+ JSON.stringify(storage)
		})
	}catch(e){
		console.error(e)
	}
}

function inspect(obj, indent = 0, tab=0) {
	const spaces = ' '.repeat(indent);
	const lines = [];
  
	for (const [key, value] of Object.entries(obj)) {
		const formattedValue = typeof value === 'object' ? inspect(value, indent + tab) : value;
		const c=typeof(formattedValue)=="string" && '"' ||''
		lines.push(`${spaces}${key}: ${c}${formattedValue}${c}`);
	}
  
	return '\n{\n' + lines.join(',\n') + `\n${spaces.slice(0, -tab)}}\n`;
}

;(async () => {
	const ServerConsole="[Server]"
	const WebConsole=   "[Web   ]"
	const {default:chalk} = await import('chalk')
	const now=(n=new Date())=>`${n.toLocaleDateString()} ${n.toLocaleTimeString()}`
	const $=(message,level)=>{
		if(typeof(message)=="object"){
			message=inspect(message).replace(/\n/g, "")
		}
		if(message.startsWith?.(WebConsole)){
			return message.replace(WebConsole, `${chalk.blue(WebConsole)} [${level}] [${now()}]`)
		}else{
			return `${chalk.gray(ServerConsole)} [${level}] [${now()}] ${message}`
		}
	}
	console.info=(fx=>message=>fx.call(console,  $(message,chalk.white ('info '))))(console.info);
	console.log=(fx=>message=>fx.call(console,   $(message,chalk.white ('info '))))(console.log);
	console.debug=(fx=>message=>fx.call(console, $(message,chalk.gray ('debug'))))(console.debug);
	console.warn=(fx=>message=>fx.call(console,  $(message,chalk.yellow('warn '))))(console.warn);
	console.error=(fx=>message=>fx.call(console, $(message, chalk.red  ('error'))))(console.error);

	puppeteer.use(require("puppeteer-extra-plugin-stealth")());
	
	const BingAIExtension=path.resolve(__dirname, "../bingAI-extension/1.0.1_0")
	const pathToExtension = path.resolve(__dirname, "..");
	const browser = await puppeteer.launch({
		executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		userDataDir:"./userData",
		defaultViewport:null,
		devtools:false,
		headless:false,
		pipe:true,
		args:[
			'--app=data:text/html,loading...', 
			`--disable-extensions-except=${BingAIExtension}`,
			`--load-extension=${BingAIExtension}`,
		]
	});
	
	console.info('Chrome Browser loaded')

	const [chat]=await browser.pages()

	await serverAI(chat, browser)

	await chat.goto("https://chat.openai.com")

	const Ignored_Errors=[
		"WebSocket is closed before the connection is established",
		"Failed to load resource:",
		"Unrecognized feature",
	]
	chat.on('console', message=>{
		const type=message.type(), text=message.text()
		if(Ignored_Errors.find(a=>text.indexOf?.(a)!=-1)){
			return
		}
		console[type=="warning" ? "warn" : type]?.(`${WebConsole} ${typeof(text)=="object" ? inspect(text).replace(/\n/g, "") : text}`)
	})
	
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

		console.info('Chrome is ready')
		const {background:{scripts}}=require(`${pathToExtension}/manifest.json`)
		for(let script of scripts){
			await chat.addScriptTag({path:`${pathToExtension}/${script}`})
		}

		console.info('bro is ready')

		await chat.evaluate(()=>{
			bros.bingAI.getCookie=async ()=>{
				throw new Error(`helper[${helper}] not supported BingAI`)
			}
			bros.chatgpt.test("hello")
		})

		await chat.evaluate(()=>{
			const container=document.body.appendChild(document.createElement('ul'))
			container.style="padding:10px;position:absolute;width:500px;height:auto;background:green;top:10px;right:10px"
			
			const header=container.appendChild(document.createElement('li'))
			header.style="text-align:center;"
			const helpers=container.appendChild(document.createElement('li'))
			header.innerHTML="Bridge.Qili2 Running"

			helpers.innerHTML="Helpers: "
			const refresh=async ()=>{
				const {me}=await Qili.fetch({
					query:`query{me{helpers}}`
				})
				helpers.innerHTML=`Helpers: ${me.helpers.join(",")}`
			}
			setInterval(refresh, 60*1000)
			refresh()

			const server=container.appendChild(document.createElement('li'))
			server.id="server"
			server.innerHTML="Server Info: "
		})
		console.info('indicator is ready')
	})();

	process.on('SIGINT',()=>process.exit())
	process.on('SIGTERM',()=>process.exit())
	process.on('beforeExit',async ()=>{
		await browser.close()
		console.info('Bridge Cleared!')
	})
})();
