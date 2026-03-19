let admin;

try {
  admin = require('firebase-admin');
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }
} catch (err) {
  // Firebase not configured – use mock
  console.warn('Firebase Admin not configured. Using mock auth.');
  admin = {
    apps: [],
    auth: () => ({
      verifyIdToken: async () => { throw new Error('Firebase not configured'); },
      createUser: async () => {},
      deleteUser: async () => {},
    }),
  };
}

module.exports = admin;
