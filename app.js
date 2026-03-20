import { app } from "./firebase.js";

import {
getAuth,
GoogleAuthProvider,
signInWithPopup,
signInWithEmailAndPassword,
updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
getFirestore,
doc,
getDoc,
setDoc,
collection,
addDoc,
query,
where,
getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let codigoGenerado = "";
let uidUsuario = "";

// GENERAR CÓDIGO
function generarCodigo(){
const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
let codigo="";
for(let i=0;i<6;i++){
codigo+=chars.charAt(Math.floor(Math.random()*chars.length));
}
return codigo;
}

document.addEventListener("DOMContentLoaded", () => {

// CAMBIAR ENTRE LOGIN Y CREAR
const crearCuenta = document.getElementById("crearCuenta");
const loginBox = document.getElementById("loginBox");

document.getElementById("irLogin").onclick = () => {
crearCuenta.classList.add("hidden");
loginBox.classList.remove("hidden");
};

document.getElementById("volverCrear").onclick = () => {
loginBox.classList.add("hidden");
crearCuenta.classList.remove("hidden");
};

// GOOGLE LOGIN
document.getElementById("googleLogin").onclick = async () => {

const result = await signInWithPopup(auth,provider);
const user = result.user;

uidUsuario = user.uid;

const userRef = doc(db,"users",uidUsuario);
const userSnap = await getDoc(userRef);

if(!userSnap.exists()){
await setDoc(userRef,{
email:user.email,
nombre:user.displayName,
creado:Date.now()
});
}

crearCuenta.classList.add("hidden");
document.getElementById("passwordBox").classList.remove("hidden");

document.getElementById("mensaje").innerText="Crea una contraseña";
};

// GUARDAR PASSWORD
document.getElementById("guardarPassBtn").onclick = async () => {

const pass1 = document.getElementById("newPass").value;
const pass2 = document.getElementById("repeatPass").value;

if(pass1 !== pass2){
document.getElementById("mensaje").innerText="No coinciden";
return;
}

if(pass1.length < 6){
document.getElementById("mensaje").innerText="Mínimo 6 caracteres";
return;
}

try{

await updatePassword(auth.currentUser,pass1);

codigoGenerado = generarCodigo();

await addDoc(
collection(db,"private1",uidUsuario,"codigos"),
{
codigo:codigoGenerado,
fecha:Date.now()
}
);

document.getElementById("mensaje").innerText="Código: " + codigoGenerado;

document.getElementById("passwordBox").classList.add("hidden");
document.getElementById("verificationBox").classList.remove("hidden");

}catch(e){
document.getElementById("mensaje").innerText="Error al guardar contraseña";
}

};

// VERIFICAR CÓDIGO
document.getElementById("verificarBtn").onclick = async () => {

const codigoInput = document.getElementById("codigoInput").value;

const q = query(
collection(db,"private1",uidUsuario,"codigos"),
where("codigo","==",codigoInput)
);

const snapshot = await getDocs(q);

if(!snapshot.empty){
document.getElementById("mensaje").innerText="Verificado";
window.location.href="panel.html";
}else{
document.getElementById("mensaje").innerText="Código incorrecto";
}

};

// LOGIN NORMAL
document.getElementById("loginBtn").onclick = async () => {

const email = document.getElementById("emailLogin").value;
const pass = document.getElementById("passLogin").value;

try{
await signInWithEmailAndPassword(auth,email,pass);
window.location.href="panel.html";
}catch(e){
document.getElementById("mensaje").innerText="Error login";
}

};

});
