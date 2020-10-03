const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const cors = require('cors');
const path = require('path');

require('dotenv').config();
const {generateMessage, generateLocationMessage} = require('./utils/message');
const { addUser,removeUser,getUser,getUsersInRoom,getAlluser} = require('./utils/users')
const {addRoom,getAllRoom} = require('./utils/rooms')

const message = require('./utils/message');



const port = process.env.PORT || 3000;
const app=express();
const server =http.createServer(app);
const io = socketio(server);

//app.use(cors());

const publicDirectoryPath = path.join(__dirname,'build')

//setup static directory to serve
app.use(express.static(publicDirectoryPath))
app.use(cors());
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });

io.on('connection',(socket)=>{   
    console.log(`connection is established via id : ${socket.id}`)

    socket.on('join',(options,callback)=>{        
        const {error,user}=addUser({id:socket.id,...options})
        if(error){
            return callback(error);
        }
        addRoom(user.room)
        socket.join(user.room)
    
        socket.emit('message',generateMessage('Admin',`Welcome ${user.username}`));
        socket.broadcast.to(user.room).emit('message',generateMessage('Admin',`${user.username} has joined !`))

        io.to(user.room).emit('userInRoom',{
            room:user.room,
            users:getUsersInRoom(user.room)
        })
       
        callback();
    })
    socket.emit('roomList',getAllRoom());
    
    socket.on('sendMessage',(message,callback)=>{
        const user =getUser(socket.id);
        if(user){
            io.to(user.room).emit('message',generateMessage(user.username,message,socket.id))
        }
        callback()
    })
    socket.on('disconnect',()=>{
        const user = removeUser(socket.id)
     
        if(user){
            io.to(user.room).emit('message',generateMessage('Admin', `${user.username} has left!`))
            
            io.to(user.room).emit('userInRoom',{
                room:user.room,
                users:getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port,()=>{
    console.log(`Server is up on port ${port} !`)
})