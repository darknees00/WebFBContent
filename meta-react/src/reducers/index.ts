// reducers.ts
import { combineReducers } from 'redux';

// Ví dụ về một reducer đơn giản
const initialState = {
  data: null,
};

const dataReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case 'SET_DATA':
      return {
        ...state,
        data: action.payload,
      };
    default:
      return state;
  }
};

// Kết hợp tất cả các reducer vào một rootReducer
const rootReducer = combineReducers({
  data: dataReducer,
});

export type RootState = ReturnType<typeof rootReducer>;  // Dùng để xác định kiểu cho state của Redux
export default rootReducer;
