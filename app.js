import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getFirestore, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  // Credenciales
  apiKey: "AIzaSyAfbpjL6SUxfAkJhlezmRCl5KOrVxJVhGo",
  authDomain: "armario-seba-manuela.firebaseapp.com",
  projectId: "armario-seba-manuela",
  storageBucket: "armario-seba-manuela.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);

// Lógica para subir desde el explorador de archivos
document.getElementById('btn-subir').addEventListener('click', async () => {
    const archivo = document.getElementById('input-archivo').files[0];
    const categoria = document.getElementById('selector-categoria').value;
    const propietario = document.getElementById('selector-propietario').value;

    if (!archivo) return alert("Selecciona una imagen primero");

    const storageRef = ref(storage, `prendas/${propietario}/${Date.now()}_${archivo.name}`);
    
    try {
        const snapshot = await uploadBytes(storageRef, archivo);
        const urlDescarga = await getDownloadURL(snapshot.ref);

        // Guardar metadatos en la base de datos
        await addDoc(collection(db, "prendas"), {
            propietario: propietario,
            categoria: categoria,
            url_imagen: urlDescarga,
            fecha: new Date()
        });
        
        alert("Prenda subida con éxito");
        cargarArmario(); // Refrescar galería
    } catch (error) {
        console.error("Error al subir:", error);
    }
});

// Función para equipar la ropa al hacer clic en la galería
window.equiparPrenda = (url, categoria) => {
    document.getElementById(`capa-${categoria}`).src = url;
};

// Generar imagen combinada y compartir
document.getElementById('btn-compartir').addEventListener('click', async () => {
    const escenario = document.getElementById('escenario-outfit');
    
    // html2canvas toma el contenedor con todas las capas puestas y lo vuelve una sola imagen plana
    const canvas = await html2canvas(escenario, { backgroundColor: null });
    
    canvas.toBlob(async (blob) => {
        const archivo = new File([blob], "mi-outfit.png", { type: "image/png" });
        
        // Si el dispositivo soporta compartir archivos directamente (Web Share API, muy común en móviles)
        if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
            try {
                await navigator.share({
                    title: 'Nuestro Outfit',
                    text: '¡Mira la combinación que armé para hoy! ¿Qué te parece?',
                    files: [archivo]
                });
            } catch (error) {
                console.log("Compartir cancelado", error);
            }
        } else {
            // Fallback: Descargar la imagen para que la envíes manualmente
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'outfit-descargado.png';
            a.click();
            alert("Imagen descargada. Ahora puedes enviarla como adjunto.");
        }
    });
});
