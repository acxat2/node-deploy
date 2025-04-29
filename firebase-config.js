import dotenv from "dotenv";
dotenv.config();
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: "work-nosql.firebaseapp.com",
  databaseURL: process.env.DB_URL,
  projectId: "work-nosql",
  storageBucket: "work-nosql.firebasestorage.app",
  messagingSenderId: process.env.MES_SENDER_ID,
  appId: process.env.APP_ID,
  measurementId: process.env.MEASUREMENT_ID,
};
initializeApp(firebaseConfig);
export const db = getDatabase();
export const sessionLimit = 600000;
