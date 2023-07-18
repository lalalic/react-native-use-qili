const { withFilter }=require("graphql-subscriptions")
let uuid=Date.now()
let pubsub
/**
 * pubsub engine doesn't support changing on-fly since it's unsafe to close
 * each app should only have one qili-web-proxy module, so module pubsub is safe enough in a context vm
 */

module.exports=(singlePubsub,topic="default")=>{
    if(pubsub){
        singlePubsub?.close?.()
    }else{
        pubsub=singlePubsub
    }
    return {
        name:"qili-web-proxy",
        typeDefs:`
            extend type Query{
                answerHelp(session:String!, response:JSON!):JSON
            }

            extend type Subscription{
                askThenWaitAnswer(message:JSON!):JSON
                helpQueue(helper:String):JSON
            }
        `,
        resolver:{
            Query:{
                answerHelp(_,{session, response}, {app}){
                    app.pubsub.publish(`${app.app.apiKey}.${topic}.answer`, {session, response})
                    return true
                },
            },
            Subscription:{
                askThenWaitAnswer:{
                    subscribe(_,{message}, {app, user}){
                        if(Helpers.no){
                            app.logger.info('No helper, discard an ask')
                            throw new Error("Your request can't be processed now!")
                        }
                        const ask={session:`${++uuid}`,message}
                        app.pubsub.publish(`${app.app.apiKey}.${topic}.ask`, ask)
                        return withFilter(
                            ()=>app.pubsub.asyncIterator([`${app.app.apiKey}.${topic}.answer`]),
                            answer=>{
                                const answered=answer.session==ask.session
                                if(answered){
                                    app.logger.info(`ask[${answer.session}] is answered and returned to asker`)
                                }
                                return answered
                            },
                        )(...arguments)
                    },
                    resolve(answer){
                        return answer.response
                    }
                },

                helpQueue:{
                    subscribe(_,{helper}, {app,user}){
                        Helpers.add(helper=user._id||helper)
                        return withFilter(
                            ()=>app.pubsub.asyncIterator([`${app.app.apiKey}.${topic}.ask`]),
                            ask=>{
                                const picked=Helpers.pick1(ask)===helper
                                if(picked){
                                    app.logger.info(`ask[${ask.session}] is send to helper[${helper}]`)
                                }
                                return picked
                            }
                        )(...arguments)
                    },
                    resolve(ask,{},{app,user}){
                        Helpers.done1(ask)
                        return ask
                    }
                }
            }
        },
        pubsub:{
            init(){
                return pubsub
            },
            onDisconnect({app,user, request}){
                switch(request?.id){
                    case "helpQueue":
                        Helpers.remove(user._id)
                        Helpers.remove(request.variables.helper)
                    break
                }
            }
        },
            
        finalize(app){
            // if(pubsub && !pubsub.closed){
            //     pubsub.publish(`${app.app.apiKey}.${topic}.answer`,{closed:true})
            //     pubsub.publish(`${app.app.apiKey}.${topic}.ask`,{closed:true})
            //     pubsub.close?.()
            // }
        }
    }
}

class Helpers{
    constructor(){
        const helpers=[], sessions={}
        Helpers.add=this.add=function(helper){
            const id=helper
            if(!helpers.find(a=>a.id==id)){
                helpers.push({id,sessions:[]})
                console.info(`helper[${helper}] join`)
            }
            return id
        }

        Helpers.remove=this.remove=function(helper){
            const i=helpers.findIndex(a=>a.id==helper)
            if(i!=-1){
                helpers.splice(i,1)
                console.info(`helper[${helper}] left!`)
                return helper
            }
        }

        Helpers.pick1=this.pick1=function({session, message}){
            console.debug({helpers, sessions})
            if(session in sessions)
                return

            let picker
            if(message.options?.helper){
                picker=helpers.find(a=>a.id==message.options.helper)    
            }

            if(!picker){
                picker=helpers.reduce((min,a)=>{
                    if(a.sessions.length<min.sessions.length){
                        return a
                    }
                    return min
                },helpers[0])
            }


            picker.sessions.push(session)
            sessions[session]=picker.id
            console.info(`pick helper[${picker.id}] for ask[${session}]`)
            return picker.id
        }
        Helpers.done1=this.done1=function({session}){
            const helperId=sessions[session]
            if(!helperId)
                return 
            const helper=helpers.find(a=>a.id==helperId)
            if(!helper)
                return 
            const i=helper.sessions.indexOf(session)
            if(i==-1)
                return 
            helper.sessions.splice(i,1)
            delete sessions[session]
            console.info(`ask[${session}] picked and removed from queue`)
        }

        Object.defineProperty(Helpers,"no",{
            get(){
                return helpers.length==0
            }
        })
    }
    
    static instance=new Helpers()
}
