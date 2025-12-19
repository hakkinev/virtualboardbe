const express = require('express')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const router = express.Router()
const prisma = new PrismaClient()


router.post('/login', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { email: req.body.email }
        })

        if (user === null) {
            console.log('no user found')
            return res.status(401).send({ msg: "Authentication failed" })
        }

        const match = await bcrypt.compare(req.body.password, user.password)

        if (!match) {
            console.log('bad password')
            return res.status(401).send({ msg: "Authentication failed" })
        }

        const accessToken = jwt.sign({
            sub: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            typ: "access"
        },
            process.env.JWT_SECRET, { expiresIn: '15m' })

        // refresh token 30d
        const refreshToken = jwt.sign({
            sub: user.id,
            typ: "refresh"
        },
            process.env.JWT_SECRET, { expiresIn: '30d' })

        // expire tiden för databas
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

        // spara refresh token i databasen
        await prisma.refreshToken.create({
            data: {
                user_id: user.id,
                token: refreshToken,
                expires_at: expiresAt
            }
        })

        // skicka båda tokens till klienten
        res.send({
            msg: "Login OK",
            accessToken: accessToken,
            refreshToken: refreshToken
        })

    } catch (error) {
        console.log(error)
        res.status(500).send({
            msg: "Error: Login failed",
            error: error.message
        })
    }
})

router.post('/', async (req, res) => {

    try {
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