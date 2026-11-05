export default function Inicio() {
    return (
        <main className="mx-auto max-w-2xl px-6 py-16 text-center">
            <h1 className="text-4xl font-bold">Match Educativo</h1>

            <p className="mt-4">
                Encuentra compañeros con quienes compartir lo que sabes
                y aprender lo que te interesa.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
                <a href="/registro" className="rounded bg-[#124277] px-4 py-2 text-white">
                    Crear cuenta
                </a>
                <a href="/login" className="rounded border px-4 py-2">
                    Iniciar sesión
                </a>
            </div>
        </main>
    );
}