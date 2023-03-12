import jwt from 'jsonwebtoken';
import { dispatch } from '../store/index.js';

const authenMiddleware = (socket, next) => {
  console.log('Authen...');
  if (socket.handshake.query?.token) {
    const token = socket.handshake.query.token;
    try {
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          console.log('Authen failed');
          return next(new Error('authen failed'));
        }
        const userId = decoded.id;
        dispatch({
          type: 'SET_USER',
          payload: { userId, socketId: socket.id, token },
        });

        console.log('Authen successfully');
        next();
      });
    } catch (error) {
      console.log(error);
    }
  } else {
    console.log('token not found');
    next(new Error('Authentication error'));
  }
};

export default authenMiddleware;
