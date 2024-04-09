/**
 * Provide payment schema
 */
module.exports={
    name:"payment",
    typeDefs:`
        type Product{
            id: String!
            type: String!
            sku: String!
            group: String
            groupName: String
            title: String
            description: String
            localizedPrice: String
            price: Float
            currency: String
            subscriptionDuration: String
            subscriptionIntroPhases: [JSON]
            status: String
        }

        type Purchase{
            id: String!
            sku: String!
            expires_date_ms: Int
            purchase_date_ms: Int
            original_purchase_date_ms: Int
            upgradeFrom: String
            subscription_group_identifier: String
            original_transaction_id: String
        }

        type Transaction{
            id: String!
            product: String!
            cost: Int!
            amount: Int
            author: String
            type: Int
        }

        extend type User{
            activeProducts: [String]
            productsForSale: [Product]
            transactions: [Transaction]
            balance: Int
        }

        extend type Mutation{
            buy(sku: String!):Purchase
            consume(info: JSON!): Transaction
        }
    `,

    indexes:{
        Product:[{sku:1}, {status:1}],
        Purchase:[{author:1, expires_date_ms:1}]
    },

    resolver:{
        User:{
            async activeProducts(_, {}, {app, user}){
                const actives=await app.findEntity("Purchase",{author:user._id,expires_date_ms:{$gt:Date.now()}})
                return [actives.sort((a,b)=>a.expires_date_ms-b.expires_date_ms).map(({sku})=>sku).pop()]
            },
            async productsForSale(_,{},{app,user}){
                return await app.findEntity("Product", {status:{$ne:"active"}})
            },
            async transactions(_,{},{app,user}){
                return await app.findEntity("Transaction", {author:user._id})
            },
            async balance(_,{},{app,user}){
                const userInfo=await app.get1Entity("User",{_id:user._id},{balance:1})
                return userInfo.balance||0
            },
        },

        Mutation:{
            async buy(_,info,{app,user}){
                return await app.createEntity("Purchase",{...info,author:user._id, createdAt:new Date()})
            },
            async consume(_, {product, cost, ...info}, {app,user}){
                await app.patchEntity("User",{_id:user._id}, {$inc:{balance: -cost}})
                return await app.createEntity("Transaction", {...info, product, cost, author:user._id,})
            }
        }
    },

    events:{
        events:{
            purchase(purchase){
                console.debug(`purchased ${purchase.sku}[${purchase.transaction_id}]`)
            },
            ["purchase.verified"](validPaid){
                console.debug(`totalTokens: ${validPaid}`)
            }
        }
    }
}