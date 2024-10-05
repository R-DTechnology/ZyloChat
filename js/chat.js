import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, addDoc, onSnapshot, doc, getDoc, orderBy, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCWNYaSXTDQDrEcHICIhLZkz-jtHyS2i60",
  authDomain: "zylochat7.firebaseapp.com",
  projectId: "zylochat7",
  storageBucket: "zylochat7.appspot.com",
  messagingSenderId: "630897643182",
  appId: "1:630897643182:web:ea6045ed921ba42a5a673f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);
const storage = getStorage(app);

let currentUser = null;
let currentNickname = null;       
let selectedUserId = null;
let selectedUserNickname = null; 
let selectedConversationId = null; 

const getConversationId = (userId1, userId2) => {
  return userId1 < userId2 ? `${userId1}_${userId2}` : `${userId2}_${userId1}`;
};

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

document.getElementById('search-bar').addEventListener('keyup', async (event) => {
  const searchTerm = event.target.value.trim();
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

    resultItem.addEventListener('click', async () => {
      selectedUserId = userId;
      selectedUserNickname = userNickname;

      document.getElementById('chat-title').innerText = `Chat with ${selectedUserNickname}`;

      selectedConversationId = getConversationId(currentUser.uid, selectedUserId);
      await ensureConversationExists(selectedConversationId);
      listenForMessages(selectedConversationId);

      await addRecentChat(selectedUserId, selectedUserNickname);
      
      await addRecentChatToOtherUser(currentUser.uid, currentNickname, selectedUserId);
      
      resultsContainer.innerHTML = '';
    });

    resultsContainer.appendChild(resultItem);
  });
});

// Function to send a message
const sendMessage = async () => {
  const messageInput = document.getElementById('message-input');
  const messageText = messageInput.value.trim();

  if (messageText && selectedConversationId) {
    const newMessage = {
      senderId: currentUser.uid,
      senderNickname: currentNickname,
      text: messageText,
      timestamp: serverTimestamp()
    };

    const messagesCollection = collection(db, `conversations/${selectedConversationId}/messages`);
    await addDoc(messagesCollection, newMessage);

    messageInput.value = ''; // Clear the input field
  } else {
    alert("Please select a user to chat with or enter a message!");
  }
};

// Event listener for send button
document.getElementById('send-btn').addEventListener('click', sendMessage);

// New keydown event listener for message input
document.getElementById('message-input').addEventListener('keydown', async (event) => {
  if (event.key === 'Enter') { // Check if the pressed key is 'Enter'
    event.preventDefault(); // Prevent the default action (like form submission)
    await sendMessage(); // Call the send message function
  }
});

document.getElementById('attach-btn').addEventListener('click', () => {
  document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', async (event) => {
  const file = event.target.files[0];

  if (file && selectedConversationId) {
    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64String = reader.result;

      const newMessage = {
        senderId: currentUser.uid,
        senderNickname: currentNickname,
        file: base64String, 
        timestamp: serverTimestamp()
      };

      const messagesCollection = collection(db, `conversations/${selectedConversationId}/messages`);
      await addDoc(messagesCollection, newMessage);

      event.target.value = '';
    };

    reader.readAsDataURL(file); // Read the file as a Data URL (Base64)
  } else {
    alert("Please select a user to chat with before sending a file.");
  }
});

const listenForMessages = (conversationId) => {
  if (!conversationId) return;

  const messagesCollection = collection(db, `conversations/${conversationId}/messages`);
  const messagesQuery = query(messagesCollection, orderBy("timestamp", "asc"));

  onSnapshot(messagesQuery, (querySnapshot) => {
    const messages = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.timestamp) {
        data.timestamp = new Date().getTime();
      }
      messages.push(data);
    });

    displayMessages(messages);
  });
};

const displayMessages = (messages) => {
  const chatMessagesDiv = document.getElementById('chat-messages');
  chatMessagesDiv.innerHTML = ''; 

  messages.forEach((message) => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message');
    messageDiv.classList.add(message.senderId === currentUser.uid ? 'outgoing' : 'incoming');

    if (message.file) {
      const fileElement = document.createElement('img');
      fileElement.src = message.file; 
      fileElement.alt = "Attached file";
      fileElement.style.maxWidth = "200px"; 
      messageDiv.appendChild(fileElement);
    } else {
      const textSpan = document.createElement('span');
      textSpan.innerHTML = `<strong>${message.senderNickname}:</strong> ${message.text}`;
      messageDiv.appendChild(textSpan);
    }

    chatMessagesDiv.appendChild(messageDiv);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight; 
  });
};

const loadRecentChats = async () => {
  const recentChatsCollection = collection(db, `users/${currentUser.uid}/recentChats`);
  const querySnapshot = await getDocs(recentChatsCollection);

  const recentChatsList = document.getElementById('recent-chats-list');
  recentChatsList.innerHTML = ''; 

  for (const recentChatDoc of querySnapshot.docs) {
    const recentChat = recentChatDoc.data();
    const userDocRef = doc(db, "users", recentChat.userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const nickname = userDoc.data().nickname;
      const recentChatItem = document.createElement('li');
      recentChatItem.textContent = nickname;
      recentChatItem.setAttribute('data-user-id', recentChat.userId);
      recentChatItem.addEventListener('click', async () => {
        selectedUserId = recentChat.userId;
        selectedUserNickname = nickname;

        document.getElementById('chat-title').innerText = `Chat with ${selectedUserNickname}`;
        selectedConversationId = getConversationId(currentUser.uid, selectedUserId);
        await ensureConversationExists(selectedConversationId);
        listenForMessages(selectedConversationId);
      });
      recentChatsList.appendChild(recentChatItem);
    }
  }
};

const ensureConversationExists = async (conversationId) => {
  const conversationDocRef = doc(db, "conversations", conversationId);
  const conversationDoc = await getDoc(conversationDocRef);

  if (!conversationDoc.exists()) {
    await setDoc(conversationDocRef, { createdAt: serverTimestamp() });
  }
};

const addRecentChat = async (userId, userNickname) => {
  const recentChatRef = doc(db, `users/${currentUser.uid}/recentChats`, userId);
  await setDoc(recentChatRef, { userId: userId, nickname: userNickname });
};

const addRecentChatToOtherUser = async (currentUserId, currentUserNickname, otherUserId) => {
  const recentChatRef = doc(db, `users/${otherUserId}/recentChats`, currentUserId);
  await setDoc(recentChatRef, { userId: currentUserId, nickname: currentUserNickname });
};

// Logout function (optional)
document.getElementById('logout-btn').addEventListener('click', async () => {
  await auth.signOut();
  console.log("User logged out.");
});
