// search.js
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { db } from './firebase.js';
import { debounce } from './utils.js';
import { initChat } from './chat.js';

const performSearch = async (searchTerm) => {
  const resultsContainer = document.getElementById('search-results');
  resultsContainer.innerHTML = '';

  if (searchTerm === "") {
    return; 
  }

  const q = query(collection(db, "users"), where('nickname', '>=', searchTerm), where('nickname', '<=', searchTerm + '\uf8ff'));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    resultsContainer.innerHTML = '<div>No user found</div>';
    return;
  }

  querySnapshot.forEach(docSnap => {
    const userId = docSnap.id;
    const userNickname = docSnap.data().nickname;

    const resultItem = document.createElement('div');
    resultItem.classList.add('search-result-item');
    resultItem.innerText = userNickname;

    resultItem.addEventListener('click', () => initChat(userId, userNickname));

    resultsContainer.appendChild(resultItem);
  });
};

export const initSearch = () => {
  document.getElementById('search-bar').addEventListener('keyup', debounce(async (event) => {
    const searchTerm = event.target.value.trim();
    await performSearch(searchTerm);
  }, 300));
};
