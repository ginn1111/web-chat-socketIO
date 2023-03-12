import { createServer } from 'http';
import { Server } from 'socket.io';
import privateRequest from './src/services/axios.js';
import authenMiddleware from './src/middlewares/authen.js';
import {
  emitUsrOnl,
  getSocketId,
  emitStateConversations,
} from './src/helper.js';
import { dispatch, selector } from './src/store/index.js';
import {
  selectUsersOnline,
  selectStateConversationList,
} from './src/store/selectors.js';

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

io.use(authenMiddleware).on('connection', (socket) => {
  console.log('connection');

  //[SEND USER CONNECTING TO OTHER]
  emitUsrOnl(socket.broadcast, selector(selectUsersOnline));

  //[SEND USER CONNECTING TO ITSELF]
  socket.on('INIT_CONVERSATIONS', (userId) => {
    const usersOnline = selector(selectUsersOnline);
    const socketId = getSocketId(userId, usersOnline);
    socketId && emitUsrOnl(io.to(socketId), usersOnline);
  });

  socket.on('GET_STATE_CONVERSATIONS', (userId) => {
    console.log('GET_STATE_CONVERSATIONS');
    const usersOnline = selector(selectUsersOnline);
    const socketId = getSocketId(userId, usersOnline);
    socketId &&
      emitStateConversations(
        io.to(socketId),
        selector(selectStateConversationList)
      );
    console.log({ stateConversation: selector(selectStateConversationList) });
  });

  //[SEND ADD FRIEND]
  socket.on('ADD_FRIEND', (payload) => {
    const usersOnline = selector(selectUsersOnline);
    const socketId = getSocketId(payload.receiverId, usersOnline);
    io.to(socketId).emit('ADD_FRIEND', payload);
    console.log(payload);
  });

  //[UPDATE CONVERSATION SEEN/UNSEEN]
  socket.on('UPDATE_STATE_CONVERSATION', ({ conversationId, isSeen }) => {
    dispatch({
      type: 'UPDATE_STATE_CONVERSATION',
      payload: { conversationId, isSeen },
    });
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
      console.log(
        `senderId: ${senderId}, receiverId: ${receiverId}, text: ${text}, socketIdReceiver:${socketIdReceiver}`
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
      console.log({ stateConversation: selector(selectStateConversationList) });
    }
  );

  //[UPDATE FROM TIME ONLINE TO DB (CALL API)]
  socket.on('UPDATE_CONVERSATION', async ({ conversationIdList, userId }) => {
    try {
      const usersOnline = selector(selectUsersOnline);
      const { token } = usersOnline[userId];
      console.log('update conversation...');
      await Promise.all(
        conversationIdList.map((id) =>
          privateRequest(token).put(`/conversations/${id}/update-time`, {
            fromOnline: Date.now(),
          })
        )
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

const port = process.env.PORT || 8900;
io.listen(port, console.log(`Socket server running on ${port}`));
