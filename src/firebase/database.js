import database from './firebaseInit';

const writeData = (roomId, role, data, successCallback) => {
  database.ref(`rooms/${roomId}/${role}`).set(
    data,
    (err) => {
      if (!err) {
        successCallback?.();
      }
      console.log(err);
    }
  );
};

const clearData = (roomId, successCallback) => {
  database.ref(`rooms/${roomId}`).set({}, (err) => {
    if (!err) {
      successCallback();
    }
    console.log(err);
  })
}

const readData = async (roomId) => {
  const res = await database.ref(`rooms/${roomId}`).get();
  if (res.exists()) {
    return res.val();
  }
  throw Error('READ DATA ERROR');
};

export { writeData, readData, clearData };
