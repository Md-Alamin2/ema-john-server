const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const cors =require('cors');
var admin = require("firebase-admin");

const app = express();
const port = process.env.PORT || 5000;

// firebase admin initialization


var serviceAccount = require('./ema-john-simple-e3f38-firebase-adminsdk-ydgy3-37c16f6d0e.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.akmch.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function verifyToken (req, res, next){
    if(req.headers?.authorization?.startsWith('Bearer ')){
        const idToken = req.headers.authorization.split('Bearer ')[1];
       try{
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUserEmail = decodedUser.email;
       }
       catch{

       }
    }
    next();
}
async function run(){
    try{
        await client.connect();
        const database = client.db('online_shop');
        const productCollection = database.collection('products');
        const ordersCollection = database.collection('orders');

        //GET Products API
        app.get('/products', async (req, res) => {
            const cursor = productCollection.find({});
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let products;
            const count = await cursor.count();
            if(page){
                products = await cursor.skip(page*size).limit(size).toArray();
            }
            else{
                 products = await cursor.toArray();
            }
        
            res.send({
                count,
                products
            })

        })
    // Use POST to get data by keys
        app.post('/products/buyKes', async(req, res) => {
            const keys =req.body;
            const query = {key: {$in: keys}}
            const products = await productCollection.find(query).toArray();
            res.json(products);
            
        }) 

        // Add order APT
        app.get('/orders', verifyToken, async(req, res) => { 
            const email = req.query.email;
            if(req.decodedUserEmail === email){
                const query ={email: email}
                const cursor = ordersCollection.find(query);
                const orders = await cursor.toArray();
                res.json(orders);  
            }
           else{
                res.status(401).json({message: 'User not authorize'})
           }
              
            
           
            
        })
        app.post('/orders', async (req, res) => {
            const order = req.body;
            order.createdAT = new Date();
            const result = await ordersCollection.insertOne(order);
            res.json(order)
        })

    }
    finally{
        // await client.close();
    }
}
run().catch(console.dir)



app.get('/', (req, res) => {
    res.send('Ema john server Running.......');
})

app.listen(port, () => {
    console.log("server running at port", port);
})

