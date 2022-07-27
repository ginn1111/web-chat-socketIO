const httpServer = require('http').createServer();
const io = require('socket.io')(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
  },
});
const jwt = require('jsonwebtoken');
const privateRequest = require('./src/services/axios');

let usersOnline = {};

const getUsrOnl = (usersOnline) =>
  Object.keys(usersOnline).reduce(
    (acc, userId) => ({
      ...acc,
      [userId]: usersOnline[userId].fromOnline,
    }),
    {},
  );

const getUserIdFromSocketId = (socketId, usersOnline) =>
  Object.entries(usersOnline).find(
    ([_, infor]) => infor.socketId === socketId,
  )?.[0];

const updateOfflineTime = (socketId, usersOnline) => {
  const userId = getUserIdFromSocketId(socketId, usersOnline);
  return {
    ...usersOnline,
    [userId]: {
      ...usersOnline[userId],
      fromOnline: Date.now(),
    },
  };
};

const emitUsrOnl = (socket, usersOnline) => {
  return socket.emit('GET_USER_ONLINE', getUsrOnl(usersOnline));
};

const getSocketId = (userId, usersOnline) => usersOnline[userId].socketId;

io.use(function (socket, next) {
  console.log('Authen...');
  if (socket.handshake.query?.token) {
    const token = socket.handshake.query.token;
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
      if (error) {
        console.log('Authen failed');
        return next(new Error('authen failed'));
      }
      const userId = decoded.id;
      socket.auth = { token, userId };
      usersOnline[userId] = {
        socketId: socket.id,
        token,
        fromOnline: null,
      };
      console.log('Authen successfully');
      next();
    });
    next();
  } else {
    console.log('token not found');
    next(new Error('Authentication error'));
  }
}).on('connection', (socket) => {
  socket.on('CALL_USER_ONLINE', () => {
    io.emit('GET_USER_ONLINE', getUsrOnl(usersOnline));
  });

  socket.on(
    'SEND_MESSAGE',
    ({ receiverId, senderId, text, conversationId }) => {
      console.log(
        `senderId: ${senderId}, receiverId: ${receiverId}, text: ${text}, socketId: ${getSocketId(
          receiverId,
          usersOnline,
        )}`,
      );
      io.to(getSocketId(receiverId, usersOnline)).emit('GET_MESSAGE', {
        senderId,
        text,
        conversationId,
      });
    },
  );

  socket.on('UPDATE_CONVERSATION', async ({ conversationIdList, userId }) => {
    // call api to update fromOnline time
    try {
      const { token, conversationId } = usersOnline[userId];
      console.log('update conversation...');
      const response = await Promise.all(
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
      console.log(response.map((res) => res.data));
      console.log('update successfully');
    } catch (error) {
      console.log(`update error ${error}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnect');
    // usersOnline = Object.fromEntries(
    //   Object.entries(usersOnline).filter((u) => u[1] !== socket.id),
    // );
    usersOnline = updateOfflineTime(socket.id, usersOnline);
    console.log({ usersOnline });
    emitUsrOnl(socket.broadcast, usersOnline);
  });
});

io.listen(8900, console.log(`Socket server running on ${8900}`));
