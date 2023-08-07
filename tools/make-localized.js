import LocalizedStrings from 'react-native-localization'

const default_zh={
    "Sign Out":"退出账号",
    "Settings":"设置",
    "Information":"信息",
    "Privacy Policy":"隐私政策",
    "About":"产品介绍",
    "Phone Number":"电话",
    "Request Code":"申请验证码",
    "Re-Request":"重新申请",
    "Verification Code":"验证码",
    "Cancel":"取消",
    "Login":"登录",
    "Sign Up / Sign In":"注册登录",
    "Version":"运行版本",
    
    "Update":"更新检查",
    "There's an update, do you want to update?":"又一个更新版本，需要跟新吗？",
    "Yes":"是的",
    "No":"不",
    "There's no update.":"没有跟新的版本",
    
    "Get Membership":"加入会员更优惠",
    "Recurring billing. Cancel anytime.":`循环计费。随时取消。`,
    "Your subscription will auto-renew for the same price and duration until you cancel at any time from the App Store.":"免费体验过后才会产生扣款，你的订阅将用相同的价格和时间自动更新，你随时可以在苹果商店取消订阅.",
    "Subscribe now and enjoy the following:":`现在订阅立即获得:`,
    "Continue":"立即购买",
    "month":"月",
    "buy":"购买",
    "Buy successfully!":"购买成功！",
    "You have an active subscription":"会员已开通",
    "Auto-renewal disabled":"自动更新已失效",
    "Auto-renewal active":"自动更新生效中",
    "Manage subscription":"管理订阅",
    "Replace subscription":"更换订阅"
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
    
    return globalThis.l10n=new Proxy(strings,{
        get(targets, key){
            if(typeof(key)=="string"){
                return targets[key]||printf(key)
            }
            return targets[key]
        }
    })
}