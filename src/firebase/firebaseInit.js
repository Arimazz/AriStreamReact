import firebase from 'firebase';

const CONFIG = {
  apiKey: 'AIzaSyBWPLx-DU9ANq9jqe3UsEYgFogpErlZAyw',
  authDomain: 'aristream-87487.firebaseapp.com',
  databaseURL:
    'https://aristream-87487-default-rtdb.europe-west1.firebasedatabase.app',
};

firebase.initializeApp(CONFIG);
const database = firebase.database();

export default database;
