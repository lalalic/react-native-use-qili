const { withFilter }=require("graphql-subscriptions")
let uuid=Date.now()

function getHelperID(user,helper){
    return `${user._id}_${helper}`
}

module.exports=(pubsub,topic="default")=>({
    name:"qili-web-proxy",
    typeDefs:`
        extend type Query{
            answerHelp(session:String!, response:JSON!, helper:String):JSON
        }

        extend type Subscription{
            askThenWaitAnswer(message:JSON!):JSON
            helpQueue(helper:String):JSON
        }
    `,
    resolver:{
        Query:{
            answerHelp(_,{session, response, helper}, {app,user}){
                app.pubsub.publish(`${app.app.apiKey}.${topic}.answer`, {session, response})
                app.emit("bridge.helper.answered", user, getHelperID(user, helper))
                return true
            },
        },
        Subscription:{
            askThenWaitAnswer:{
                subscribe(_,{message}, {app, user}){
                    if(Helpers.no){
                        app.emit('bridge.helper.no')
                        throw new Error("Your request can't be processed now!")
                    }
                    const ask={session:`${++uuid}`,message}
                    app.pubsub.publish(`${app.app.apiKey}.${topic}.ask`, ask)
                    app.emit('bridge.asker.asked',user)
                    return withFilter(
                        ()=>app.pubsub.asyncIterator([`${app.app.apiKey}.${topic}.answer`]),
                        answer=>{
                            const answered=answer.session==ask.session
                            if(answered){
                                app.emit('bridge.asker.answered',user)
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
                    const helperUID=Helpers.add(getHelperID(user,helper))
                    if(helperUID){
                        app.emit('bridge.helper.registered',user, helperUID)
                    }
                    return withFilter(
                        ()=>app.pubsub.asyncIterator([`${app.app.apiKey}.${topic}.ask`]),
                        ask=>{
                            const picked=Helpers.pick1(ask)===helperUID
                            if(picked){
                                app.emit('bridge.helper.pick1', user, helperUID)
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
                    const helperUID=getHelperID(user, request.variables.helper)
                    Helpers.remove(helperUID)
                    app.emit('bridge.helper.left', user, helperUID)
                break
            }
        }
    },
        
    finalize(app){
        if(pubsub && !pubsub.closed){
            /*
            pubsub.publish(`${app.app.apiKey}.${topic}.answer`,{closed:true})
            pubsub.publish(`${app.app.apiKey}.${topic}.ask`,{closed:true})
            */
            pubsub.close?.()
        }
    }
})

class Helpers{
    constructor(){
        const helpers=[], sessions={}
        Helpers.add=this.add=function(helper){
            const id=helper
            if(!helpers.find(a=>a.id==id)){
                helpers.push({id,sessions:[]})
                return id
            }
        }

        Helpers.remove=this.remove=function(helper){
            const i=helpers.findIndex(a=>a.id==helper)
            if(i!=-1){
                helpers.splice(i,1)
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
        }

        Object.defineProperty(Helpers,"no",{
            get(){
                return helpers.length==0
            }
        })
    }
    
    static instance=new Helpers()
}
