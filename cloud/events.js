const $=user=>user&&(user.username||user.phone||user.contact||user._id)
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
        ["auth.result"](error, user){
            console.debug(`user auth result: ${!error}`)
        },
        ["auth.error"](error){
            console.debug(`user auth error: ${error}`)
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
        },
        ["bridge.helper.registered"](helper,helperUID){
            console.debug(`helper[${helperUID}] registered`)
        },
        ["bridge.helper.pick1"](helper, helperUID){
            console.debug(`helper[${helperUID}] pick 1`)
        },
        ["bridge.helper.answered"](helper, helperUID){
            console.debug(`helper[${helperUID}] answer 1`)
        },
        ["bridge.helper.left"](helper, helperUID){
            console.debug(`helper[${helperUID}] left`)
        },
        ["bridge.helper.no"](){
            console.error(`No Helper`)
        },
        ["bridge.asker.asked"](asker){
            console.debug(`asker[${$(asker)}] asked 1`)
        },
        ["bridge.asker.answered"](asker){
            console.debug(`asker[${$(asker)}] got 1`)
        },
    }
}