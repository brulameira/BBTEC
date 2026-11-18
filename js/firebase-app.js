/* Inicialização única do Firebase (Auth + Firestore) para as telas de login e cadastro.
   A versão do SDK fica só aqui. Importe o que precisar a partir deste arquivo. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

export const firebaseConfigurado = !Object.values(firebaseConfig).some(v => v === "COLE_AQUI");
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
auth.languageCode = "pt-BR";

export {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup,
  GoogleAuthProvider, sendPasswordResetEmail, updateProfile, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* Cria o perfil em usuarios/{uid} se ainda não existir.
   Nunca grava senha: ela fica só no Firebase Authentication. */
export async function garantirPerfil(usuario, extra = {}) {
  const ref = doc(db, "usuarios", usuario.uid);
  const existente = await getDoc(ref);
  if (existente.exists()) return;
  await setDoc(ref, {
    nome: extra.nome || usuario.displayName || "",
    email: usuario.email || "",
    empresa: extra.empresa || "",
    cargo: extra.cargo || "",
    criadoEm: serverTimestamp()
  });
}

// Guarda nome e e-mail para o menu lateral das telas do sistema
export function lembrarUsuario(usuario, nome) {
  sessionStorage.setItem("bbtecUsuario", nome || usuario.displayName || (usuario.email || "").split("@")[0]);
  sessionStorage.setItem("bbtecEmail", usuario.email || "");
}