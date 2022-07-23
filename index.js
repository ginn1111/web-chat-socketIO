const httpServer = require('http').createServer();
const io = require('socket.io')(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
  },
});

let usersOnline = {};

const getUsrOnl = usersOnline => Object.keys(usersOnline);
const emitUsrOnl = socket => usersOnline => socket.emit('GET_USER_ONLINE', getUsrOnl(usersOnline));

io.on('connection', (socket) => {
  console.log('user connect');

  socket.on('ADD_USER', (userId) => {
    usersOnline[userId] = socket.id;
    console.log('ADD_USER');
    console.log({ usersOnline });
    emitUsrOnl(io)(usersOnline);
  });

  socket.on(
    'SEND_MESSAGE',
    ({ receiverId, senderId, text, conversationId }) => {
      console.log(
        `sender: ${usersOnline[senderId]}; receiver: ${usersOnline[receiverId]}`,
      );
      io.to(usersOnline[receiverId]).emit('GET_MESSAGE', {
        senderId,
        text,
        conversationId,
      });
    },
  );

  socket.on('UPDATE_CONVERSATION', payload => {
    // call api to update fromOnline time 
    console.log('updateConversation', payload);
  });

  socket.on('disconnect', () => {
    console.log('user disconnect');
    usersOnline = Object.fromEntries(Object.entries(usersOnline).filter(u => u[1] !== socket.id));
    console.log(socket.id);
    console.log(usersOnline);
    emitUsrOnl(socket.broadcast)(usersOnline);
  });
});

io.listen(8900);
