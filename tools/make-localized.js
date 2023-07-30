import LocalizedStrings from 'react-native-localization'

export default function makeLocalized(data,lang){
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
            }
        },
        ...data
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
    
    return new Proxy(strings,{
        get(targets, key){
            return targets[key]||printf(key)
        }
    })
}