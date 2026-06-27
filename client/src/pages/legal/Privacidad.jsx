import PublicLayout from '@/components/PublicLayout'

export default function Privacidad() {
  return (
    <PublicLayout>
      <main className="max-w-3xl mx-auto px-gutter py-xl min-h-screen">
        <h1 className="font-headline-xl text-headline-xl text-primary mb-lg">POLÍTICA DE PRIVACIDAD</h1>
        <p className="font-label-caps text-label-caps text-secondary mb-xl">Última actualización: Enero 2025</p>

        {[
          ['1. INFORMACIÓN QUE RECOPILAMOS', 'Recopilamos información que usted nos proporciona directamente al realizar una compra, suscribirse a nuestro boletín o comunicarse con nosotros. Esto incluye nombre, dirección de correo electrónico, número de teléfono y dirección de envío.'],
          ['2. USO DE LA INFORMACIÓN', 'Utilizamos su información para procesar pedidos, enviar confirmaciones de compra, responder a sus consultas y mejorar nuestros servicios. No compartimos su información personal con terceros excepto cuando sea necesario para completar su pedido.'],
          ['3. COOKIES', 'Utilizamos cookies para mejorar su experiencia de navegación y recordar sus preferencias. Puede controlar el uso de cookies a través de la configuración de su navegador.'],
          ['4. SEGURIDAD DE DATOS', 'Implementamos medidas de seguridad técnicas y organizativas para proteger su información personal contra acceso no autorizado, alteración, divulgación o destrucción.'],
          ['5. SUS DERECHOS', 'Tiene derecho a acceder, corregir o eliminar su información personal. Para ejercer estos derechos, contáctenos a través de nuestros canales oficiales.'],
          ['6. CONTACTO', 'Si tiene preguntas sobre esta política de privacidad, puede contactarnos por WhatsApp: +57 311 806 4799 o por Instagram: @onerootco'],
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
