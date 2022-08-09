const httpServer = require('http').createServer();
const io = require('socket.io')(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
  },
});

const privateRequest = require('./src/services/axios');
const authenMiddleware = require('./src/middlewares/authen');
const {
  emitUsrOnl,
  getSocketId,
  emitStateConversations,
} = require('./src/helper');
const { dispatch, selector } = require('./src/store');
const {
  selectUsersOnline,
  selectStateConversationList,
} = require('./src/store/selectors');

io.use(authenMiddleware).on('connection', (socket) => {
  console.log('connection');
  // socket?.emit('STATE_CONVERSATIONS', selector(selectStateConversationList));

  //[SEND USER CONNECTING TO OTHER]
  emitUsrOnl(socket.broadcast, selector(selectUsersOnline));

  //[SEND USER CONNECTING TO ITSELF]
  socket.on('INIT_CONVERSATIONS', (userId) => {
    const usersOnline = selector(selectUsersOnline);
    const socketId = getSocketId(userId, usersOnline);
    if (socketId) {
      console.log({ stateConversation: selector(selectStateConversationList) });
      emitStateConversations(
        io.to(socketId),
        selector(selectStateConversationList),
      );
      emitUsrOnl(io.to(socketId), usersOnline);
    }
  });

  //[UPDATE CONVERSATION SEEN/UNSEEN]
  socket.on('UPDATE_STATE_CONVERSATION', ({ conversationId, isSeen }) => {
    dispatch({
      type: 'UPDATE_STATE_CONVERSATION',
      payload: { conversationId, isSeen },
    });

    socket.emit('UPDATE_STATE_CONVERSATION_ITEM', conversationId);
  });

  //[JOIN ROOM]
  socket.on('JOIN_ROOM', (rooms) => {
    rooms.forEach((room) => socket.join(room));
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
      socketIdReceiver
        ? io.to(socketIdReceiver).emit('GET_MESSAGE', {
            senderId,
            text,
            conversationId,
          })
        : socket.to(conversationId).emit('GET_MESSAGE', {
            senderId,
            text,
            conversationId,
          });

      //[UPDATE CONVERSATION BE UNSEEN]
      dispatch({
        type: 'UPDATE_STATE_CONVERSATION',
        payload: { conversationId, isSeen: false },
      });
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
