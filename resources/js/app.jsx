import { createRoot } from 'react-dom/client'; //
import Registro from './components/registro.jsx'; //traemos la funcion registro 


const contenedor = document.getElementById('app'); //busca app.blade.php
 
createRoot(contenedor).render(<Registro />);