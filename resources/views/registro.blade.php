<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>

<body>
    <main>
    <h1>Crear cuenta</h1>
    <p>Registrate en Match Educativo</p>

    <form id="formulario-registro">
  <br>
    
    <div>
        <label for="name">nombre</label><br>
   <input type="text" id="name" name="name" maxlength="191" autocomplete="name" required>
    </div>
    <div>
        <label for="email">Correo Electronico</label><br>
   <input type="email" id="email" name="email" maxlength="191" autocomplete="email" required>
    </div>
    <div>
        <label for="password">Contraseña</label><br>
   <input type="password" id="password" name="password" maxlength="191" autocomplete="password" required>
    </div>
    <div>
        <label for="password_confirmation">confimar_Contraseña</label><br>
   <input type="password" id="password_confirmation" name="password_confirmation" maxlength="191" autocomplete="password_confirmation" required>
    </div>  

    <div>

    <button type="submit">registrarme</button>
    </div>\

    </form>
    <p id="mensaje" role="status"></p>

  </main>
</body>
<script>
    const formulario = document.getElementById('formulario-registro');
    const mensaje = document.getElementById('mensaje');
    const boton = formulario.querySelector('button[type="submit"]');

    formulario.addEventListener('submit', async function (evento) {
        evento.preventDefault();

        boton.disabled = true;
        mensaje.textContent = 'Registrando...';

        const datos = {
            name: formulario.elements.name.value,
            email: formulario.elements.email.value,
            password: formulario.elements.password.value,
            password_confirmation:
                formulario.elements.password_confirmation.value
        };

        try {
            const respuesta = await fetch('/api/registrar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(datos)
            });

            const resultado = await respuesta.json();

            if (respuesta.ok) {
                mensaje.textContent = resultado.message;
                formulario.reset();
            } else if (respuesta.status === 422) {
                mensaje.textContent =
                    Object.values(resultado.errors).flat().join(' ');
            } else {
                mensaje.textContent =
                    'No se pudo completar el registro. Inténtalo de nuevo.';
            }
        } catch (error) {
            mensaje.textContent =
                'No se pudo conectar con el servidor. Inténtalo de nuevo.';
        } finally {
            boton.disabled = false;
        }
    });
</script>
</html>