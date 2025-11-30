const express = require('express')
const { PrismaClient } = require('../generated/user-client')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const router = express.Router()
const prisma = new PrismaClient()

// POST /login – logga in användare
router.post('/login', async (req, res) => {
    try {
        // Hämta användaren baserat på email
        const user = await prisma.user.findUnique({
            where: { email: req.body.email }
        })

        if (user === null) {
            console.log('no user found')
            return res.status(401).send({ msg: "Authentication failed" })
        }

        // Jämför lösenordet med bcrypt
        const match = await bcrypt.compare(req.body.password, user.password)

        if (!match) {
            console.log('bad password')
            return res.status(401).send({ msg: "Authentication failed" })
        }

        // Skapa JWT-token
        const token = jwt.sign({
            sub: user.id,
            email: user.email,
            name: user.name
        }, process.env.JWT_SECRET, { expiresIn: '30d' })

        // Skicka svar med token
        res.send({ msg: "Login OK", jwt: token })

    } catch (error) {
        console.log(error)
        res.status(500).send({ msg: "Error: Login failed" })
    }
})

// POST /register – skapa ny användare
router.post('/register', async (req, res) => {

    try {
        // Kolla om användaren redan finns
        const existingUser = await prisma.user.findUnique({
            where: { email: req.body.email }
        })

        if (existingUser) {
            console.log('user already exists')
            return res.status(400).send({ msg: "User already exists" })
        }

        // Skapa ny användare med hashat lösenord
        const hashedPassword = await bcrypt.hash(req.body.password, 12)

        const newUser = await prisma.user.create({
            data: {
                email: req.body.email,
                password: hashedPassword // hash av lösenordet
            }
        })

        res.json({ msg: "New user created", id: newUser.id })

    } catch (error) {
        console.log(error)
        res.status(500).send({ msg: "Error: Create user failed" })
    }

})

module.exports = router
