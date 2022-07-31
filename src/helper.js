const getUsrOnl = (usersOnline) =>
  Object.keys(usersOnline).reduce(
    (acc, userId) => ({
      ...acc,
      [userId]: usersOnline[userId]?.fromOnline,
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

const getSocketId = (userId, usersOnline) => usersOnline[userId]?.socketId;

const emitStateConversations = (io, stateConversations) => io.emit('GET_STATE_CONVERSATIONS', stateConversations);

module.exports = {
  getUsrOnl,
  getUserIdFromSocketId,
  updateOfflineTime,
  emitUsrOnl,
  getSocketId,
  emitStateConversations
};
