require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')
const morgan = require('morgan')

const port = process.env.PORT || 9000
const app = express()
// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(express.json())
app.use(cookieParser())
app.use(morgan('dev'))

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token

  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mq0mae1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.z7eow.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})
async function run() {
  try {
    const db = client.db('plantNet-session')
    const usersCollection = db.collection('users')
    const plantsCollection = db.collection('plants')
    const orderCollection = db.collection('orders')

    // save or update a user in db 
    app.post('/users/:email', async (req, res) => {
      const email = req.params.email
      const query = { email }
      const user = req.body
      // check if user exists in db
      const isExist = await usersCollection.findOne(query)
      if (isExist) {
        return res.send(isExist)
      }
      const result = await usersCollection.insertOne({
        ...user,
        role: 'customer',
        timestamp: Date.now(),
      })
      res.send(result)
    })

    //manage user status and role
    app.patch('/users/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      console.log(email)
      const query = { email }
      const user = await usersCollection.findOne(query)
      if (!user || user?.status === 'Requested')
        return res
          .status(400)
          .send('You have already requested, await for some time.')

      const updateDoc = {
        $set: {
          status: 'Requested',
        },
      }
      const result = await usersCollection.updateOne(query, updateDoc)
      console.log(result)
      res.send(result)
    })

    // get user role
    app.get('/users/role/:email', async (req, res) => {
      const email = req.params.email
      const result = await usersCollection.findOne({email})
      res.send({role: result?.role})
    })

    // Generate jwt token
    app.post('/jwt', async (req, res) => {
      const email = req.body
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })

    // Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
      } catch (err) {
        res.status(500).send(err)
      }
    })

    // save plant data in db
    app.post('/plants', verifyToken, async (req, res) => {
      const plant = req.body
      const result = await plantsCollection.insertOne(plant)
      res.send(result)
    })

    // get all plants from db
    app.get('/plants', async (req, res) => {
      const result = await plantsCollection.find().limit(20).toArray()
      res.send(result)
    })

    // get a plant by id
    app.get('/plants/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await plantsCollection.findOne(query)
      res.send(result)
    })

    // save order data in db
    app.post('/order', verifyToken, async (req, res) => {
      const orderInfo = req.body
      const result = await orderCollection.insertOne(orderInfo)
      res.send(result)
    })

    // manate plant quantity
    app.patch('/plants/quantity/:id', verifyToken, async (req, res) => {
      const id = req.params.id
      const { quantityToUpdate, status } = req.body
      const filter = { _id: new ObjectId(id) }
      let updateDoc = {
        $inc: { quantity: -quantityToUpdate }
      }
      if (status === 'increase') {
        updateDoc = {
          $inc: { quantity: quantityToUpdate }
        }
      }
      const result = await plantsCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    // get all orders for a specific costomer
    app.get('/customer-orders/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      const query = { 'customer.email': email }
      const result = await orderCollection
        .aggregate([
          {
            $match: query, //Match specific customers data only by email
          },
          {
            $addFields: {
              plantId: { $toObjectId: '$plantId' } //convert plantId string field to objectId field
            },
          },
          {
            $lookup: { //go to different collection and look for data
              from: 'plants', // collection name
              localField: 'plantId', // locat data that you want to match
              foreignField: '_id', // foreign field name of that same data
              as: 'plants', //return the data as plants array (array naming)
            },
          },
          { $unwind: '$plants' }, // unwind lookup result, return without array
          {
            $addFields: { // add these fields in order object
              name: '$plants.name',
              image: '$plants.imageUrl',
              category: '$plants.category',
            },
          },
          {
            $project: { // remove object property from order object
              plants: 0,
            },
          },
        ]).toArray()
      res.send(result)
    })

    // Cancel/delete an order
    app.delete('/orders/:id', verifyToken, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const order = await orderCollection.findOne(query)
      if (order.status === 'Delivered')
        return res.status(409).send('Cannot cancel once the product is delivered!')
      const result = await orderCollection.deleteOne(query)
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello from plantNet Server..')
})

app.listen(port, () => {
  console.log(`plantNet is running on port ${port}`)
})
