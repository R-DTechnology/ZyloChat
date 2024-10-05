import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, query, where, getDocs, collection } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";


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

function displayMessage(message) {
  const messageArea = document.getElementById('message-area');
  messageArea.innerText = message;
}

document.getElementById('go-to-signup').addEventListener('click', () => {
  document.getElementById('auth-title').innerText = 'Sign Up for ZyloChat';
  document.getElementById('signup-fields').style.display = 'block';
  document.getElementById('login-fields').style.display = 'none';
});

document.getElementById('go-to-login').addEventListener('click', () => {
  document.getElementById('auth-title').innerText = 'Login to ZyloChat';
  document.getElementById('signup-fields').style.display = 'none';
  document.getElementById('login-fields').style.display = 'block';
});

document.getElementById('signup-btn').addEventListener('click', async () => {
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const nickname = document.getElementById('signup-nickname').value;

  if (email && password && nickname) {
    try {
      const nicknameQuery = query(collection(db, "users"), where("nickname", "==", nickname));
      const querySnapshot = await getDocs(nicknameQuery);

      if (!querySnapshot.empty) {
        displayMessage("This nickname is already in use. Please choose another one.");
        return; 
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), { nickname: nickname });

      await sendEmailVerification(user);
      displayMessage("Verification email sent! Please check your inbox.");

      await signOut(auth);
    } catch (error) {
      console.error("Error signing up:", error.message);
      displayMessage("Error signing up: " + error.message);
    }
  } else {
    displayMessage("Please fill out all fields.");
  }
});

document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (!user.emailVerified) {
      displayMessage("Please verify your email address before logging in.");
      await signOut(auth); 
      return;
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const nickname = userDoc.exists() ? userDoc.data().nickname : user.email;

    displayMessage(`Welcome back, ${nickname}!`);

    window.location.href = "chat.html"; 
  } catch (error) {
    console.error("Error logging in:", error.message);
    displayMessage("Error logging in: " + error.message);
  }
});
