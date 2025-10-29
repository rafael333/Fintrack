import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
// Import dinâmico do Analytics somente em produção

// Configuração do Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAKOQ_7Q6pR6UvinMwtzrNdLgpBxZ-QTxk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "apprafael-c7411.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "apprafael-c7411",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "apprafael-c7411.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "389810659865",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:389810659865:web:3392a3c2fe3aef4710c088",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-0P0HZ6ST2P"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Log de debug para verificar configuração
console.log('🔥 Firebase config:', {
  apiKey: firebaseConfig.apiKey ? '✅ Configurada' : '❌ Não configurada',
  authDomain: firebaseConfig.authDomain ? '✅ Configurada' : '❌ Não configurada',
  projectId: firebaseConfig.projectId ? '✅ Configurada' : '❌ Não configurada',
  environment: import.meta.env.VITE_ENVIRONMENT || 'development'
});

// Inicializar serviços do Firebase
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Analytics apenas em produção, com import dinâmico e checagens de ambiente
let analytics;
const isProd = (import.meta.env.PROD || import.meta.env.VITE_ENVIRONMENT === 'production');
const hasMeasurement = Boolean(firebaseConfig.measurementId);
const isSecureContext = (typeof window !== 'undefined' && (window.isSecureContext || location.protocol === 'https:'));

if (isProd && hasMeasurement && isSecureContext) {
  import('firebase/analytics')
    .then(({ getAnalytics }) => {
      try {
        analytics = getAnalytics(app);
      } catch (error) {
        console.warn('⚠️ Analytics não pôde ser inicializado:', error);
      }
    })
    .catch((e) => console.warn('⚠️ Falha ao carregar módulo de analytics:', e));
}

export { analytics };

export default app;
