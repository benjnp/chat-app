const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const port = process.env.PORT || 3000
const server = http.createServer(app)
const io = socketio(server)
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

io.on('connection', (socket) => {
    console.log("New web socket connection")

    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })
        if (error)
            return callback(error)

        socket.join(user.room)

        socket.emit('messageToAll', generateMessage('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('messageToAll', generateMessage('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })
    socket.on('message', (messageFromUser, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if (filter.isProfane(messageFromUser))
            return callback('Profanity is not allowed')

        io.to(user.room).emit('messageToAll', generateMessage(user.username, messageFromUser))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
            io.to(user.room).emit('messageToAll', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    socket.on('location', (loc, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${loc.latitude},${loc.longitude}`))
        callback()
    })
})



server.listen(port, () => {
    console.log(`Server is running on port ${port}!`)
})