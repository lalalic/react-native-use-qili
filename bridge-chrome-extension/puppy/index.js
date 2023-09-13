const puppeteer = require("puppeteer-extra")
puppeteer.use(require("puppeteer-extra-plugin-stealth")());
const path = require("path")


const BingAIExtension=path.resolve(__dirname, "../bingAI-extension/1.0.1_0")
const pathToExtension = path.resolve(__dirname, "..")

const Colors={"admin-console":"gray", "admin-chatgpt":"yellow", "admin-bingAI":"blue"}
async function setupLogger( page ){
	const {default:chalk} = await import('chalk')
	const pad=(name,len=15)=>{
		return `${name}           `.substring(0,len).replace(name, chalk[Colors[name]]?.(name)||name)
	}
	if(page){
		const Ignored_Errors=[
			"WebSocket is closed before the connection is established",
			"Failed to load resource:",
			"Unrecognized feature",
			"[Report Only]",
		]
		let helper=null
		page.on('console', async message=>{
			if(!helper){
				try{
					helper=await page.evaluate(()=>globalThis.bros.helper)
				}catch(e){}
			}
			const type=message.type(), text=message.text()
			if(Ignored_Errors.find(a=>text.indexOf?.(a)!=-1)){
				return
			}
			if(type!=="warning"){
				console[type]?.(`[${helper}] ${typeof(text)=="object" ? inspect(text).replace(/\n/g, "") : text}`)
			}
		})
		return 
	}
	const now=(n=new Date())=>`${n.toLocaleDateString()} ${n.toLocaleTimeString()}`
	const $=(message,level)=>{
		if(typeof(message)=="object"){
			message=inspect(message).replace(/\n/g, "")
		}
		const matched=message.match(/^\[(?<helper>.*?)\]/)
		if(matched){
			return message.replace(/^\[.*?\]/, `[${pad(matched.groups.helper)}] [${level}] [${now()}]`)
		}else{
			return `${globalThis.bros?.helper && `[${pad(globalThis.bros.helper)}] `||''}[${level}] [${now()}] ${message}`
		}
	}
	console.info=(fx=>message=>fx.call(console,  $(message,chalk.white ('info '))))(console.info);
	console.log=(fx=>message=>fx.call(console,   $(message,chalk.white ('info '))))(console.log);
	console.debug=(fx=>message=>fx.call(console, $(message,chalk.gray ('debug'))))(console.debug);
	console.warn=(fx=>message=>fx.call(console,  $(message,chalk.yellow('warn '))))(console.warn);
	console.error=(fx=>message=>fx.call(console, $(message, chalk.red  ('error'))))(console.error);
}

async function setupBrowser({appMode, headless}){
	const browser = await puppeteer.launch({
		executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		userDataDir:"./userData",
		defaultViewport:null,
		devtools:false,
		headless,
		pipe:true,
		args:[
			appMode && '--app=data:text/html,loading...', 
			`--disable-extensions-except=${BingAIExtension}`,
			`--load-extension=${BingAIExtension}`,
		].filter(Boolean)
	});
	
	console.info('Chrome Browser loaded')

	const [page]=await browser.pages()
	return {page,browser}
}

async function prepareBingAICookie(page){
	const bingURL="https://www.bing.com/search"
	await page.goto(bingURL)

	await (async ()=>{
		return new Promise(async function test(resolve){
			const cookie=await page.evaluate(()=>document.cookie)
			if(cookie.indexOf("; ANON=")!=-1){
				process.env.bingAICookie=cookie
				
				if(cookie){
					console.log(`BingAI is ready : ${cookie}`)
					resolve()
				}
			}else{
				console.warn(`Bing need login`)
				await page.evaluate(()=>alert(`Please login to continue`))
				page.once("requestfinished",req=>{
					if(req.url()==bingURL){
						test(resolve)
					}
				})
			}
		})
	})();
}

async function prepareChatGPTToken(page){
	const chatURL="https://chat.openai.com"
	await page.goto(chatURL)
	const {token, expires}=await page.evaluate(()=>{
			return new Promise(async function test(resolve, reject){
				const resp = await fetch("https://chat.openai.com/api/auth/session")
				try {
					const data = await resp.json()
					if(!data.accessToken){
						throw new Error("no token")
					}
					resolve({token: data.accessToken, expires: data.expires})
				} catch (err) {
					console.error(err)
					alert(`Please login to continue`)
					page.once("requestfinished",req=>{
						if(req.url()==chatURL){
							test(resolve)
						}
					})
				}
		})
	})
	console.log(`ChatGPT is ready: ${token}`)
	process.env.chatgptToken=token
	return expires
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

async function setupChatPage({page, url, helper, autoAI, fx}){
	await page.goto(url)
	await setupLogger(page)
	await page.evaluate(autoAI=>{
		globalThis.autoAI=autoAI
		const chrome=globalThis.chrome||(globalThis.chrome={})
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
	}, autoAI)

	console.info('Chrome is ready')
	const {background:{scripts}}=require(`${pathToExtension}/manifest.json`)
	for(let script of scripts){
		await page.addScriptTag({path:`${pathToExtension}/${script}`})
		if(script=="env.js" && helper){
			await page.evaluate(helper1=>helper=helper1,helper)
		}
	}

	console.info(`bro[${helper}] is ready`)

	await page.evaluate(()=>{
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
	})
	fx?.(page)
	console.info('indicator is ready')
}

async function servAllFromServer(){
	const {page, browser}=await setupBrowser();

	await prepareBingAICookie(page)

	const expires=await prepareChatGPTToken(page)

	const {Qili}=require("./server")

	Qili.schedule(
		()=>process.env.chatgptToken=null,
		expires, 
		async ()=>{
			const {page, browser}=await setupBrowser()
			await prepareChatGPTToken(page)
			await browser.close()
		},
		10*60*1000
	)

	await browser.close()
}

async function serverChatGPTAndBingAI(){
	process.argv.push("--chatgpt=false")
	process.argv.push("--bingAI=false")
	const {Qili} = require("./server")
	
	const {page, browser}=await setupBrowser({appMode:false,headless:false});
	await setupChatPage({page,
		url:"https://chat.openai.com", 
		helper:`${globalThis.helper}-chatgpt`, 
		autoAI:["chatgpt","openAI"],
		fx:page=>page.evaluate(()=>{
			bros.chatgpt.notifyExpiration=function(){
				console.error('chatgpt token will be expired in 10 minutes')
			}
		})
	})

	await setupChatPage({page:await browser.newPage(), 
		url:"https://www.bing/chat", 
		helper:`${globalThis.helper}-bingAI`,
		autoAI:["bingAI","openAI"],
		fx:page=>page.evaluate(()=>bros.bingAI.getCookie=()=>document.cookie)
	})
	return browser
}

(async()=>{
	await setupLogger()
	await serverChatGPTAndBingAI()
})();


