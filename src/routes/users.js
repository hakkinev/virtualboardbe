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

// klienten skickar refresh token i authHeader och returnerar en ny access token (15min)
router.post('/refresh', async (req, res) => {

    try {
        const authHeader = req.headers['authorization']
        const token = authHeader?.split(' ')[1]

        if (!token) {
            return res.status(401).send({ msg: "Missing refresh token" })
        }

        // verifiera jwt med signatur och expiration
        const payload = jwt.verify(token, process.env.JWT_SECRET)

        // måste vara refresh token
        if (payload.typ !== "refresh") {
            return res.status(401).send({ msg: "Wrong token type" })
        }

        // kolla att refresh token finns i db
        const row = await prisma.refreshToken.findUnique({
            where: { token: token }
        })

        if (!row) {
            return res.status(401).send({ msg: "Refresh token not found" })
        }

        // db expiration tid
        if (row.expires_at < new Date()) {
            return res.status(401).send({ msg: "Refresh token expired" })
        }

        // skapa ny access token
        const newAccessToken = jwt.sign({
            sub: payload.sub,
            typ: "access"
        },
            process.env.JWT_SECRET, { expiresIn: '15m' })

        res.send({
            msg: "New access token",
            accessToken: newAccessToken
        })

    } catch (error) {
        console.log(error)
        res.status(401).send({
            msg: "Refresh failed",
            error: error.message
        })
    }
})

// klienten skickar refresh token i authHeader ochraderar refresh token från db
router.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers['authorization']
        const token = authHeader?.split(' ')[1]

        if (!token) {
            return res.status(400).send({ msg: "Missing token" })
        }

        // radera raden med samma token från db
        await prisma.refreshToken.deleteMany({
            where: { token: token }
        })

        res.send({ msg: "Logged out" })

    } catch (error) {
        console.log(error)
        res.status(500).send({
            msg: "Logout failed",
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