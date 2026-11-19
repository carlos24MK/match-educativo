<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#124277">
    <title>Match Educativo</title>
    <link rel="icon" type="image/webp" href="{{ asset('images/emblema-match-educativo.webp') }}">
    {{-- Vite carga React y los estilos; SecurityHeaders proporciona el nonce. --}}
    @viteReactRefresh
    @vite('resources/js/app.jsx')
</head>
<body>
    <div id="app"></div>
</body>
</html>
