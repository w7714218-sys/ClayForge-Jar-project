import { animate, rebuildVase } from "./scene.js";
import { drawProfile, initEditor } from "./ui.js";
// Crear el primer jarrón
rebuildVase();
// Dibujar el perfil
drawProfile();
// Activar el editor
initEditor();
// Iniciar renderizado
animate();