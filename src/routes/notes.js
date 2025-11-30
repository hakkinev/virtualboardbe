const express = require('express')
const { PrismaClient } = require('@prisma/client')
const authorize = require('../middleware/authorize')

const router = express.Router()
const prisma = new PrismaClient()

// JWT på ALLA /notes-routes
router.use(authorize)



// GET /notes
// SQL: SELECT * FROM notes WHERE author_id = ...

router.get('/', async (req, res) => {
    try {
        const boardId = req.query.boardId ? parseInt(req.query.boardId) : undefined // valfri boardId från query

        const notes = await prisma.note.findMany({
            where: {
                author_id: req.authUser.sub,
                ...(boardId ? { boardId } : {}) // om boardId finns, lägg till i where
            }
        })
        res.json(notes)

    } catch (error) {
        console.log(error)
        res.status(500).send({
            msg: "Error",
            error: error.message
        })
    }
})



// POST /notes
// SQL: INSERT INTO notes ...

router.post('/', async (req, res) => {
    try {
        const newNote = await prisma.note.create({
            data: {
                author_id: req.authUser.sub,   // använd alltid JWT user id
                note: req.body.note,
                x: req.body.x ?? 100,
                y: req.body.y ?? 100,
                color: req.body.color ?? "#ffffff",
                boardId: req.body.boardId ?? null // valfri boardId
            }
        })

        res.json({
            msg: "New note created",
            id: newNote.id
        })

    } catch (error) {
        console.log(error)
        res.status(500).send({
            msg: "Error: POST failed",
            error: error.message
        })
    }
})


// PUT /notes/:id
// SQL: UPDATE notes SET ... WHERE id = ...
router.put('/:id', async (req, res) => {
    const id = parseInt(req.params.id)

    try {
        const updatedNote = await prisma.note.update({
            where: { id: id },

            // bugfix: x och y måste ligga inuti "data"
            data: {
                note: req.body.note,
                x: req.body.x ?? 100,
                y: req.body.y ?? 100,
                color: req.body.color ?? "#ffffff"
            }
        })

        res.json({
            msg: `Note ${id} updated`,
            note: updatedNote
        })

    } catch (error) {
        console.log(error)
        res.status(500).send({
            msg: "Error: Could not update note",
            error: error.message
        })
    }
})


// DELETE /notes/:id
// SQL: DELETE FROM notes WHERE id = ...
router.delete('/:id', async (req, res) => {
    const id = parseInt(req.params.id)

    try {
        const deleted = await prisma.note.delete({
            where: { id: id }
        })

        res.json({
            msg: `Note ${id} deleted`,
            note: deleted
        })

    } catch (error) {
        console.log(error)
        res.status(500).send({
            msg: "Error: Could not delete note",
            error: error.message
        })
    }
})


module.exports = router
