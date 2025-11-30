const express = require('express')
const { PrismaClient } = require('@prisma/client')
const authorize = require('../middleware/authorize')

const router = express.Router()
const prisma = new PrismaClient()

// alla /boards-routes kräver JWT
router.use(authorize)

// GET /boards 
router.get('/', async (req, res) => {
    try {
        const boards = await prisma.board.findMany({
            orderBy: { id: 'asc' }
        })
        res.json(boards)
    } catch (error) {
        console.log(error)
        res.status(500).json({
            msg: "Error: Could not get boards",
            error: error.message
        })
    }
})

// POST /boards – skapa ny board 
router.post('/', async (req, res) => {
    try {
        const newBoard = await prisma.board.create({
            data: {
                name: req.body.name || "Ny board"
            }
        })

        res.json({
            msg: "New board created",
            board: newBoard
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            msg: "Error: Could not create board",
            error: error.message
        })
    }
})

module.exports = router
