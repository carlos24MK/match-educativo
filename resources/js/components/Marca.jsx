export default function Marca({ oscura = false }) {
    const texto = oscura ? 'text-white' : 'text-[#10233d]';
    const acento = oscura ? 'text-[#b9f1e7]' : 'text-[#0b665d]';

    return (
        <span className="inline-flex min-w-0 items-center gap-2.5">
            <span className={'marca-emblema grid size-12 shrink-0 place-items-center rounded-full sm:size-14' + (oscura ? ' marca-emblema-oscuro' : '')}>
                <img src="/images/emblema-match-educativo.webp" alt="" width={256} height={256}
                    className="size-full object-contain" />
            </span>
            <span className={'text-sm leading-tight font-extrabold tracking-tight sm:text-base ' + texto}>
                Match <span className={acento}>Educativo</span>
            </span>
        </span>
    );
}
