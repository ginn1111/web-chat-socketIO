const { updateOfflineTime } = require('../helper');

const INIT_STATE = {
  usersOnline: {},
  stateConversationList: {},
};

const reducer = (state = INIT_STATE, action = {}) => {
  switch (action.type) {
    case 'UPDATE_STATE_CONVERSATION': {
      return {
        ...state,
        stateConversationList: {
          ...state.stateConversationList,
          [action.payload.conversationId]: action.payload.isSeen,
        },
      };
    }
    case 'UPDATE_TIME': {
      return {
        ...state,
        usersOnline: updateOfflineTime(action.payload, state.usersOnline),
      };
    }
    case 'SET_USER': {
      return {
        ...state,
        usersOnline: {
          ...state.usersOnline,
          [action.payload.userId]: {
            socketId: action.payload.socketId,
            token: action.payload.token,
            fromOnline: null,
          },
        },
      };
    }
    default:
      return state;
  }
};

module.exports = reducer;
