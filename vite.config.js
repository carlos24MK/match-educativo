import { defineConfig } from 'vite';//nos ayuda a escribir una configuracion llamda vite    
import laravel from 'laravel-vite-plugin'; //  //complementa para que complemente vite con laravel  , para que carge los estilos de laravel y archivos javascript
import { bunny } from 'laravel-vite-plugin/fonts'; // importa una herramienta bunny foots es un servicio de tipografias
import tailwindcss from '@tailwindcss/vite'; // 
import react from '@vitejs/plugin-react'; //el import son las herramientas que hvamos a trabajar

export default defineConfig({
    plugins: [
        laravel({
            // Archivos que se cargarán en el navegador.
            input: [
                'resources/css/app.css',
                'resources/js/app.jsx',
            ],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),

        // Procesa los estilos de Tailwind.
        tailwindcss(),

        // Permite utilizar React y archivos JSX.
        react(),
    ],
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});