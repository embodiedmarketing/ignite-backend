import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import admin from "firebase-admin";
import firebaseConfig from "./serviceAccountKey";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp({
    credential: cert(firebaseConfig as ServiceAccount),
  });
}

// Export admin for backward compatibility
export default admin;
export { getMessaging };