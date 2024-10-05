// main.js
import { initAuth } from './userInfo.js'; 
import { initSearch } from './search.js';
import { initChatListeners } from './chat.js';

const initApp = () => {
  initAuth();
  initSearch();
  initChatListeners();
};

document.addEventListener('DOMContentLoaded', initApp);
