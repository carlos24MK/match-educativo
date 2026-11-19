import '../../css/auth.css';
import Marca from './Marca.jsx';

const pasos = ['Comparte', 'Encuentra', 'Conecta'];

export default function AuthLayout({ tituloId, titulo, categoria, descripcion, children }) {
    return (
        <main className="auth-page">
            <div className="auth-shell">
                <div className="auth-brand">
                    <a href="/" className="auth-logo" aria-label="Ir al inicio de Match Educativo">
                        <Marca oscura />
                    </a>

                    <div className="auth-story">
                        <p className="auth-eyebrow">Aprendizaje entre estudiantes</p>
                        <p className="auth-story-title">Las ganas de aprender se comparten.</p>
                        <p className="auth-story-copy">Enseña lo que dominas y encuentra a alguien que pueda ayudarte con tu próximo reto.</p>

                        <ol className="auth-steps" aria-label="Cómo conectar con otros estudiantes">
                            {pasos.map((paso, indice) => (
                                <li key={paso}>
                                    <span aria-hidden="true">0{indice + 1}</span>
                                    {paso}
                                </li>
                            ))}
                        </ol>
                    </div>

                    <p className="auth-tagline">Conecta, comparte y aprende.</p>
                </div>

                <section className="auth-pane" aria-labelledby={tituloId}>
                    <div className="auth-content">
                        <header className="auth-heading">
                            <p className="auth-eyebrow">{categoria}</p>
                            <h1 id={tituloId}>{titulo}</h1>
                            <p className="auth-description">{descripcion}</p>
                        </header>
                        {children}
                    </div>
                </section>
            </div>
        </main>
    );
}
