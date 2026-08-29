interface Props {
  titulo: string
}

// Placeholder temporal: cada módulo real (Ventas, Productos, Compras, etc.)
// se irá implementando en los siguientes pasos, uno por uno.
export default function ModuloPendiente({ titulo }: Props) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
      <p className="font-medium text-slate-700">{titulo}</p>
      <p className="text-sm mt-1">Este módulo se implementará en el siguiente paso.</p>
    </div>
  )
}
