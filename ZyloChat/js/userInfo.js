// userInfo.js 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { auth, db } from './firebase.js';
import { loadRecentChats } from './chat.js';

export let currentUser = null;
export let currentNickname = null;

export const initAuth = () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      console.log("Logged in as:", currentUser.uid);

      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        currentNickname = userDoc.data().nickname;
        console.log("User's nickname:", currentNickname);
      }

      loadRecentChats();
    } else {
      console.log("User is not logged in.");
    }
  });
};
