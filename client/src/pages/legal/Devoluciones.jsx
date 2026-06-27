import PublicLayout from '@/components/PublicLayout'

export default function Devoluciones() {
  return (
    <PublicLayout>
      <main className="max-w-3xl mx-auto px-gutter py-xl min-h-screen">
        <h1 className="font-headline-xl text-headline-xl text-primary mb-lg">ENVÍOS Y DEVOLUCIONES</h1>
        <p className="font-label-caps text-label-caps text-secondary mb-xl">Última actualización: Enero 2025</p>

        {[
          ['TIEMPOS DE ENVÍO', 'Procesamos los pedidos en 1-3 días hábiles. El tiempo de entrega a ciudades principales es de 3-5 días hábiles. Para municipios, puede tardar hasta 8 días hábiles.'],
          ['COSTOS DE ENVÍO', 'El costo de envío se calcula al confirmar el pedido y depende de la ubicación. Ofrecemos envío gratuito en pedidos superiores a $200.000 COP.'],
          ['POLÍTICA DE DEVOLUCIONES', 'Aceptamos devoluciones dentro de los 14 días calendario desde la recepción del producto. El artículo debe estar en condición original, sin usar, con todas las etiquetas intactas.'],
          ['PROCESO DE DEVOLUCIÓN', 'Para iniciar una devolución, contáctenos por WhatsApp o Instagram con su número de pedido y el motivo de la devolución. Le indicaremos cómo proceder.'],
          ['CAMBIOS', 'Aceptamos cambios de talla dentro de los 14 días, sujeto a disponibilidad. El costo de envío del cambio corre por cuenta del cliente.'],
          ['PRODUCTOS EN OFERTA', 'Los productos en oferta o de liquidación no son elegibles para devolución a menos que presenten defectos de fabricación.'],
        ].map(([title, body]) => (
          <div key={title} className="mb-lg">
            <h2 className="font-label-caps text-label-caps mb-sm">{title}</h2>
            <p className="font-body-md text-body-md text-secondary leading-relaxed">{body}</p>
          </div>
        ))}

        <div className="border border-primary p-md mt-xl">
          <p className="font-label-caps text-label-caps mb-sm">¿PREGUNTAS?</p>
          <p className="font-body-md text-body-md text-secondary">
            Contáctenos por{' '}
            <a href="https://wa.me/573118064799" className="text-primary border-b border-primary">WhatsApp</a>{' '}
            o por{' '}
            <a href="https://www.instagram.com/onerootco/" className="text-primary border-b border-primary">Instagram</a>.
          </p>
        </div>
      </main>
    </PublicLayout>
  )
}
