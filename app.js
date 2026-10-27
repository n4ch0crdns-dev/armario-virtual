import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAfbpjL6SUxfAkJhlezmRCl5KOrVxJVhGo",
  authDomain: "armario-seba-manuela.firebaseapp.com",
  projectId: "armario-seba-manuela",
  storageBucket: "armario-seba-manuela.firebasestorage.app", // Se mantiene para referencia, pero no se usa para subidas
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Tu API Key de ImgBB integrada
const IMGBB_API_KEY = "e6998a22fe173ca96b63ea90406e2a1d";

// 1. Equipar prenda en el personaje
window.equiparPrenda = (url, categoria) => {
    const capa = document.getElementById(`capa-${categoria}`);
    if (capa) {
        capa.src = url;
    }
};

// 2. Eliminar prenda (borra el registro de Firestore)
async function eliminarPrenda(docId) {
    if (!confirm("¿Estás seguro de que quieres eliminar esta prenda?")) return;

    try {
        await deleteDoc(doc(db, "prendas", docId));
        alert("Prenda eliminada con éxito.");
        cargarArmario();
    } catch (error) {
        console.error("Error al eliminar la prenda:", error);
        alert("Ocurrió un error al intentar eliminar la prenda.");
    }
}

// 3. Cargar Galería con soporte para Filtros y Botón de Borrado
async function cargarArmario() {
    const propietario = document.getElementById('selector-propietario').value;
    const filtroElem = document.getElementById('filtro-categoria');
    const filtro = filtroElem ? filtroElem.value : 'todas';
    const galeria = document.getElementById('galeria-prendas');
    
    if (!galeria) return;
    galeria.innerHTML = '';

    let q;
    if (filtro === 'todas') {
        q = query(collection(db, "prendas"), where("propietario", "==", propietario));
    } else {
        q = query(collection(db, "prendas"), where("propietario", "==", propietario), where("categoria", "==", filtro));
    }

    try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;

            const contenedor = document.createElement('div');
            contenedor.className = 'item-miniatura';
            contenedor.style.position = 'relative';
            contenedor.style.display = 'inline-block';

            const img = document.createElement('img');
            img.src = data.url_imagen;
            img.className = 'miniatura';
            img.title = data.categoria;
            img.onclick = () => window.equiparPrenda(data.url_imagen, data.categoria);

            const btnBorrar = document.createElement('button');
            btnBorrar.innerText = '✕';
            btnBorrar.className = 'btn-borrar';
            btnBorrar.title = 'Eliminar prenda';
            btnBorrar.onclick = (e) => {
                e.stopPropagation();
                eliminarPrenda(id);
            };

            contenedor.appendChild(img);
            contenedor.appendChild(btnBorrar);
            galeria.appendChild(contenedor);
        });
    } catch (error) {
        console.error("Error al cargar la galería:", error);
    }
}

// 4. Subir nueva prenda a ImgBB y registrar en Firestore
const btnSubir = document.getElementById('btn-subir');
if (btnSubir) {
    btnSubir.addEventListener('click', async () => {
        const archivoInput = document.getElementById('input-archivo');
        const archivo = archivoInput ? archivoInput.files[0] : null;
        const categoria = document.getElementById('selector-categoria').value;
        const propietario = document.getElementById('selector-propietario').value;

        if (!archivo) return alert("Selecciona una imagen primero");

        alert("Subiendo imagen...");

        const formData = new FormData();
        formData.append("image", archivo);

        try {
            const respuesta = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: "POST",
                body: formData
            });
            const resultado = await respuesta.json();

            if (!resultado.success) {
                throw new Error("Fallo al subir la imagen a ImgBB");
            }

            const urlDescarga = resultado.data.url;

            await addDoc(collection(db, "prendas"), {
                propietario: propietario,
                categoria: categoria,
                url_imagen: urlDescarga,
                fecha: new Date()
            });
            
            alert("¡Prenda subida con éxito!");
            if (archivoInput) archivoInput.value = '';
            cargarArmario();
        } catch (error) {
            console.error("Error al subir:", error);
            alert("Error al subir la imagen. Revisa la consola.");
        }
    });
}

// 5. Guardar Outfit Favorito
const btnGuardar = document.getElementById('btn-guardar');
if (btnGuardar) {
    btnGuardar.addEventListener('click', async () => {
        const propietario = document.getElementById('selector-propietario').value;

        const outfitActual = {
            propietario: propietario,
            fecha: new Date(),
            capas: {
                cabeza: document.getElementById('capa-cabeza')?.src || '',
                torso: document.getElementById('capa-torso')?.src || '',
                piernas: document.getElementById('capa-piernas')?.src || '',
                pies: document.getElementById('capa-pies')?.src || '',
                accesorios: document.getElementById('capa-accesorios')?.src || ''
            }
        };

        const tieneRopa = Object.values(outfitActual.capas).some(url => url && !url.endsWith('#') && !url.includes('undefined') && url !== window.location.href);
        if (!tieneRopa) return alert("Debes equipar al menos una prenda para guardar un outfit.");

        try {
            await addDoc(collection(db, "outfits_guardados"), outfitActual);
            alert("¡Outfit guardado en tus favoritos!");
        } catch (error) {
            console.error("Error al guardar outfit:", error);
            alert("Error al guardar en favoritos.");
        }
    });
}

// 6. Compartir por WhatsApp o descargar imagen
const btnCompartir = document.getElementById('btn-compartir');
if (btnCompartir) {
    btnCompartir.addEventListener('click', async () => {
        const escenario = document.getElementById('escenario-outfit');
        if (!escenario) return;
        
        try {
            const canvas = await html2canvas(escenario, { backgroundColor: null });
            
            canvas.toBlob(async (blob) => {
                const archivo = new File([blob], "mi-outfit.png", { type: "image/png" });
                
                if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
                    try {
                        await navigator.share({
                            title: 'Nuestro Outfit',
                            text: '¡Mira la combinación que armé hoy! ¿Qué te parece?',
                            files: [archivo]
                        });
                    } catch (error) {
                        console.log("Compartir cancelado", error);
                    }
                } else {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'outfit-descargado.png';
                    a.click();
                    alert("Imagen descargada. Ahora puedes enviarla como adjunto por WhatsApp.");
                }
            });
        } catch (error) {
            console.error("Error al generar la imagen:", error);
        }
    });
}

// Función para actualizar imagen base según el usuario
function actualizarImagenBase() {
    const propietario = document.getElementById('selector-propietario').value;
    const capaBase = document.getElementById('capa-base');
    
    if (capaBase) {
        if (propietario === 'sebastian') {
            capaBase.src = 'base-sebastian.png';
        } else if (propietario === 'manuela') {
            capaBase.src = 'base-manuela.png';
        }
    }

    const categorias = ['cabeza', 'torso', 'piernas', 'pies', 'accesorios'];
    categorias.forEach(cat => {
        const capa = document.getElementById(`capa-${cat}`);
        if (capa) capa.src = '';
    });
}

// Event Listeners
const selectorPropietario = document.getElementById('selector-propietario');
if (selectorPropietario) {
    selectorPropietario.addEventListener('change', () => {
        actualizarImagenBase();
        cargarArmario();
    });
}

const filtroCategoria = document.getElementById('filtro-categoria');
if (filtroCategoria) {
    filtroCategoria.addEventListener('change', cargarArmario);
}

// Carga inicial
actualizarImagenBase();
cargarArmario();
