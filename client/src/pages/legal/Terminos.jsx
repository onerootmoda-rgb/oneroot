import PublicLayout from '@/components/PublicLayout'

export default function Terminos() {
  return (
    <PublicLayout>
      <main className="max-w-3xl mx-auto px-gutter py-xl min-h-screen">
        <h1 className="font-headline-xl text-headline-xl text-primary mb-lg">TÉRMINOS Y CONDICIONES</h1>
        <p className="font-label-caps text-label-caps text-secondary mb-xl">Última actualización: Enero 2025</p>

        {[
          ['1. ACEPTACIÓN DE TÉRMINOS', 'Al acceder y utilizar el sitio web de One Root Co., usted acepta estar sujeto a estos términos y condiciones. Si no está de acuerdo con alguno de estos términos, no utilice nuestro sitio.'],
          ['2. PRODUCTOS Y PRECIOS', 'Nos reservamos el derecho de modificar los precios de los productos en cualquier momento. Los precios indicados en el momento de la compra son los precios finales. Todos los precios están en pesos colombianos (COP).'],
          ['3. PROCESO DE COMPRA', 'Los pedidos se confirman vía WhatsApp o correo electrónico. Una vez confirmado el pedido, procederemos a su preparación y envío. Los tiempos de entrega varían según la ubicación.'],
          ['4. DISPONIBILIDAD', 'La disponibilidad de productos está sujeta a cambios sin previo aviso. En caso de que un artículo no esté disponible, le notificaremos y ofreceremos alternativas o el reembolso correspondiente.'],
          ['5. PROPIEDAD INTELECTUAL', 'Todo el contenido de este sitio, incluyendo diseños, logotipos, fotografías y textos, es propiedad de One Root Co. y está protegido por leyes de derechos de autor.'],
          ['6. LIMITACIÓN DE RESPONSABILIDAD', 'One Root Co. no será responsable por daños indirectos, incidentales o consecuentes derivados del uso de nuestros productos o servicios.'],
        ].map(([title, body]) => (
          <div key={title} className="mb-lg">
            <h2 className="font-label-caps text-label-caps mb-sm">{title}</h2>
            <p className="font-body-md text-body-md text-secondary leading-relaxed">{body}</p>
          </div>
        ))}
      </main>
    </PublicLayout>
  )
}
