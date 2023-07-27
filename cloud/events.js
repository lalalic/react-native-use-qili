const $=user=>user.username||user.phone||user.contact||user._id
module.exports={
    name:"events",
    events:{
        graphql(request){
            console.debug(`graphql: ${request?.query?.replace(/\s+/g," ")}`)
        },
        load(){
            console.info('is ready')
        },
        auth(user){
            console.debug(`user[${$(user)}] auth`)
        },
        ["auth.request"](source){
            console.debug(`user request auth from ${source}`)
        },
        login(user){
            console.debug(`user[${$(user)}] login`)
        },
        logout(user){
            console.debug(`user[${$(user)}] logout`)
        },
        compileCloudCode({modules,cloudCode,staticRoot}){
            console.debug('cloud code compiled')
        },
        ["user.create"](user){
            console.debug(`user[${$(user)}] created`)
        },
        ["static"](path){
            console.debug(`> ${path}`)
        },
        ["static.matched"](path){
            console.debug(`>> ${path}`)
        },
        ["static.no"](path){
            console.debug(`>> !${path}`)
        }
    }
}