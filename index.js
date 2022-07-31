const httpServer = require('http').createServer();
const io = require('socket.io')(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
  },
});

const privateRequest = require('./src/services/axios');
const authenMiddleware = require('./src/middlewares/authen');
const { emitUsrOnl, getSocketId, getUsrOnl, emitStateConversations } = require('./src/helper');
const { dispatch, selector } = require('./src/store');
const {
  selectUsersOnline,
  selectStateConversationList,
} = require('./src/store/selectors');

io.use(authenMiddleware).on('connection', (socket) => {
  console.log('connection');
  socket?.emit('WELCOME', 'WELCOME');
  socket?.emit('STATE_CONVERSATIONS', selector(selectStateConversationList));

  //[SEND USER CONNECTING TO OTHER]
  emitUsrOnl(socket.broadcast, selector(selectUsersOnline));

  //[SEND USER CONNECTING TO ITSELF]
  socket.on('INIT_CONVERSATIONS', (userId) => {
    const usersOnline = selector(selectUsersOnline);
    const socketId = getSocketId(userId, usersOnline);
    if (socketId) {
      emitStateConversations(io.to(socketId), selector(selectStateConversationList));
      emitUsrOnl(io.to(socketId), usersOnline);
    }
  });

  //[UPDATE CONVERSATION SEEN/UNSEEN]
  socket.on('UPDATE_STATE_CONVERSATION', ({ conversationId, isSeen }) => {
    console.log('UPDATE_STATE_CONVERSATION')
    console.log({ conversationId, isSeen })
    dispatch({
      type: 'UPDATE_STATE_CONVERSATION',
      payload: { conversationId, isSeen },
    });
  });

  //[SEND MESSAGE]
  socket.on(
    'SEND_MESSAGE',
    ({ receiverId, senderId, text, conversationId }) => {
      const usersOnline = selector(selectUsersOnline);
      const socketIdReceiver = getSocketId(receiverId, usersOnline);
      dispatch({
        type: 'UPDATE_STATE_CONVERSATION',
        payload: { conversationId, isSeen: true },
      });
      console.log(
        `senderId: ${senderId}, receiverId: ${receiverId}, text: ${text}, socketIdReceiver:${socketIdReceiver}`,
      );

      //[RECEIVE MESSAGE TO USER (PRIVATE CHAT)]
      if (socketIdReceiver) {
        io.to(socketIdReceiver).emit('GET_MESSAGE', {
          senderId,
          text,
          conversationId,
        });
      }
    },
  );

  //[UPDATE FROM TIME ONLINE TO DB (CALL API)]
  socket.on('UPDATE_CONVERSATION', async ({ conversationIdList, userId }) => {
    try {
      const usersOnline = selector(selectUsersOnline);
      const { token } = usersOnline[userId];
      console.log('update conversation...');
      await Promise.all(
        conversationIdList.map(
          async (id) =>
            await privateRequest(token).put(
              `/conversations/${id}/update-time`,
              {
                fromOnline: Date.now(),
              },
            ),
        ),
      );
      console.log('update successfully');
    } catch (error) {
      console.log(`update error ${error}`);
    }
  });

  socket.on('disconnect', () => {
    dispatch({ type: 'UPDATE_TIME', payload: socket.id });
    const usersOnline = selector(selectUsersOnline);
    emitUsrOnl(socket.broadcast, usersOnline);
  });
});

const port = 8900;
io.listen(port, console.log(`Socket server running on ${port}`));
