import LocalizedStrings from 'react-native-localization'

const default_zh={
    "Sign Out":"退出账号",
    "Delete Account":"彻底删除账号",
    "Cancel":"取消",
    "Settings":"设置",
    "Information":"信息",
    "By proceeding, you consent to":"继续操作，即表示你同意",
    "About":"产品介绍",
    "Phone Number":"电话",
    "Request Code":"申请验证码",
    "Re-Request":"重新申请",
    "Verification Code":"验证码",
    "Cancel":"取消",
    "Login":"登录",
    "Sign Up / Sign In":"注册登录",
    "Version":"运行版本",
    "Are you sure you want to delete everything of your account?":"确认要完全删除你的账号下的所有数据吗？",
    "oops!":"糟糕！",
    
    "Update":"更新检查",
    "There's an update, do you want to reload?":"有一个更新的版本，需要关闭重启吗？",
    "Yes":"是",
    "No":"不",
    "There's no update.":"没有跟新的版本",

    "Start experience":"开始体验",
    "By proceeding, you consent to":"继续操作，即表示你同意",
    "Registration will enable you to access account based features":"注册可以使用基于账号的所有功能",
    "and":"和",
    "Privacy Policy":"隐私政策",
    "License Agreement":"用户许可协议",
    
    "Get Membership":"加入会员更优惠",
    "Recurring billing. Cancel anytime.":`循环计费。随时取消。`,
    "Your subscription will auto-renew for the same price and duration until you cancel at any time from the App Store.":"免费体验过后才会产生扣款，你的订阅将用相同的价格和时间自动更新，你随时可以在苹果商店取消订阅.",
    "Subscribe now and enjoy the following:":`现在订阅立即获得:`,
    "Continue":"立即购买",
    "Buy Now":"立即购买",
    "Subscript Now":"立即订阅",
    "month":"月",
    "buy":"购买",
    "Topup":"充值",
    "Restore":"恢复",
    "Amount":"数量",
    "Balance":"余额",
    "Buy successfully!":"购买成功！",
    "You have an active subscription":"会员已开通",
    "Auto-renewal disabled":"自动更新已失效",
    "Auto-renewal active":"自动更新生效中",
    "Manage subscription":"管理订阅",
    "Replace subscription":"更换订阅",
    "Restore purchases":"恢复购买",
    "Restore successful":"恢复成功",
    "Your purchases have been restored successfully!":"你的购买已经恢复！", 
    "Has ChatGPT Account?":"有ChatGPT账号?", 

    "Knowledges":"你的知识库",
    "Knowledge Name":"知识名称",
    "Knowledge":"知识",
    "Select a knowledge":"选择知识...",
    "No knowledge yet":"空知识库",
    "Audio":"语音",
    "Audio Response Sample":"语音回复样本",
    "Audio Response":"语音回复",
    "Audio Sample":`在一个漂亮的山坡上，有很多黄色的麦田。太阳很大很亮，天上还有白白的云朵。有很多小鸟在天上飞，它们唱着歌，好听极了！麦田里有一阵阵清香，像是花香一样。这个地方感觉真好，好像在梦里一样！`,
}

export default function makeLocalized({zh,en,...data}={},lang){
    const strings=new LocalizedStrings({
        en:{
            localizeNumber(d){
                if(-1!==d.indexOf("."))
                    return d
                d=parseInt(d)
                if(d>1000 && Math.floor(d/1000)*1000 == d){
                    return `${d/1000}K`
                }
                return d 
            },
            ...en,
        },
        ...data,
        zh:{
            ...default_zh,
            ...zh,
        }
    })
    
    function printf(str){
        const numbers=[]
        const key=str.replace(/\d+(\.\d+)?/g,match=>(numbers.push(match),"%d"))
        if(numbers.length==0)
            return str
    
        let localized=strings[key]
        if(!localized){
            localized=key
        }
        if(typeof(localized)=="function"){
            return localized(...numbers.map(a=>strings.localizeNumber(a)))
        }
        return localized.replace(new RegExp(`%d`,'g'),()=>strings.localizeNumber(numbers.shift()))
    }
    
    if(lang){
        strings.setLanguage(lang)
    }

    function l10n(key, ...params){
        const localized=strings[key]||key
        return localized.replace(new RegExp(/%(\d+)/,'g'),(_,p1)=>{
            return params[parseInt(p1)-1]
        })
    }
    
    return globalThis.l10n=new Proxy(l10n,{
        apply(target, thisArg, argumentsList){
            if(argumentsList.length==1){
                return globalThis.l10n[argumentsList[0]]
            }else if(argumentsList.length>1){
                return target(...argumentsList)
            }
        },
        get(targets, key){
            if(typeof(key)=="string"){
                if(key==="setLanguage"){
                    return lang=>{
                        const currentLang=strings.getLanguage()
                        if(lang==currentLang)
                            return
                        const props=strings._props[currentLang]
                        if(!props)
                            return 
                        Object.keys(props).forEach(k=>delete strings[k])
                        strings.setLanguage(lang)
                    }
                }
                return strings[key]||printf(key)
            }
            return strings[key]
        }
    })
}