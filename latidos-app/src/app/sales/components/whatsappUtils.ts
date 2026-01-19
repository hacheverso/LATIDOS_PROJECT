import { getReceiptData } from "../actions";


interface WhatsAppShareOptions {
    phone?: string;
    message?: string;
    saleId: string;
}

export async function shareReceiptViaWhatsApp(saleId: string) {
    try {
        // 1. Fetch Data
        const { sale, organization } = await getReceiptData(saleId);

        if (!sale || !organization) {
            alert("No se pudieron cargar los datos del recibo.");
            return;
        }

        // 2. Prepare Phone Number
        let phone = sale.customer.phone || "";

        // Clean phone number (remove non-digits)
        phone = phone.replace(/\D/g, '');

        // Validation / Prompt
        if (!phone || phone.length < 10) {
            const input = prompt("El cliente no tiene un número celular válido registrado. Por favor ingrésalo para enviar el recibo:", "");
            if (!input) return; // User cancelled
            phone = input.replace(/\D/g, '');
        }

        // Ensure country code (Default to Colombia 57 if missing)
        if (!phone.startsWith("57") && phone.length === 10) {
            phone = "57" + phone;
        }

        // 3. Generate Header/Footer Text
        const storeName = organization.name || "Tu Negocio";
        const dateFormatted = new Date(sale.date).toLocaleDateString("es-CO", {
            day: "2-digit", month: "2-digit", year: "numeric"
        });

        // 4. Generate PDF (Hidden)
        // We reconstruct the HTML logic here but for PDF generation (cleaner, no print dialog)

        const groupedItems: Record<string, { count: number, price: number, name: string, serials: string[] }> = {};
        sale.instances.forEach((inst: any) => {
            const name = inst.product.name;
            if (!groupedItems[name]) {
                groupedItems[name] = {
                    count: 0,
                    price: Number(inst.soldPrice || inst.product.basePrice || 0),
                    name: name,
                    serials: []
                };
            }
            groupedItems[name].count++;
            if (inst.serialNumber) {
                groupedItems[name].serials.push(inst.serialNumber);
            }
        });

        const itemsRows = Object.values(groupedItems).map(item => `
            <tr>
                <td style="text-align: center; border-bottom: 1px solid #eee; padding: 4px; vertical-align: top;">${item.count}</td>
                <td style="text-align: left; border-bottom: 1px solid #eee; padding: 4px;">
                    ${item.name}
                    ${item.serials.length > 0 ? `<br/><span style="font-size: 8px; color: #666;">S/N: ${item.serials.join(', ')}</span>` : ''}
                </td>
                <td style="text-align: right; border-bottom: 1px solid #eee; padding: 4px; vertical-align: top;">$${(item.price * item.count).toLocaleString('es-CO')}</td>
            </tr>
        `).join('');

        const element = document.createElement('div');
        element.style.width = '65mm'; // Reduced mobile width to fit A7 with margins
        element.style.padding = '5px';
        element.style.fontFamily = 'Helvetica, Arial, sans-serif';
        element.style.fontSize = '10px'; // Smaller for mobile PDF PDF
        element.style.color = '#000';
        element.style.backgroundColor = '#fff';

        element.innerHTML = `
            <div style="text-align: center; margin-bottom: 10px;">
                ${organization.logoUrl ? `<img src="${organization.logoUrl}" style="max-width: 60px; margin-bottom: 5px;" />` : ''}
                <h2 style="margin: 0; font-size: 14px;">${storeName}</h2>
                ${(organization.nit && organization.nit !== '000000000' && organization.nit !== '---') ? `<p style="margin: 2px 0;">NIT: ${organization.nit}</p>` : ''}
                <p style="margin: 2px 0;">${organization.phone || ''}</p>
            </div>
            <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; margin-bottom: 10px;">
                <p style="margin: 2px 0;"><strong>Factura:</strong> ${sale.invoiceNumber || 'Pendiente'}</p>
                <p style="margin: 2px 0;"><strong>Fecha:</strong> ${dateFormatted}</p>
                <p style="margin: 2px 0;"><strong>Cliente:</strong> ${sale.customer.name}</p>
                ${sale.customer.phone ? `<p style="margin: 2px 0;"><strong>Tel:</strong> ${sale.customer.phone}</p>` : ''}
                ${sale.customer.address ? `<p style="margin: 2px 0;"><strong>Dir:</strong> ${sale.customer.address}</p>` : ''}
                ${sale.customer.sector ? `<p style="margin: 2px 0;"><strong>Zona:</strong> ${sale.customer.sector}</p>` : ''}
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                <thead>
                    <tr>
                        <th style="text-align: center; border-bottom: 1px solid #000; padding: 4px;">Cant.</th>
                        <th style="text-align: left; border-bottom: 1px solid #000; padding: 4px;">Producto</th>
                        <th style="text-align: right; border-bottom: 1px solid #000; padding: 4px;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
            </table>
            <div style="text-align: right; font-size: 12px; font-weight: bold; margin-bottom: 15px;">
                <p style="margin: 0;">TOTAL: $${Number(sale.total).toLocaleString('es-CO')}</p>
            </div>
            <div style="text-align: center; font-size: 9px; color: #555;">
                <p>${organization.footerMsg || 'Gracias por su compra'}</p>
            </div>
        `;

        // 5. Trigger PDF Download
        const opt = {
            margin: 1,
            filename: `Recibo_${sale.invoiceNumber || sale.id.slice(0, 6)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 } as any,
            html2canvas: { scale: 4, useCORS: true }, // Higher scale for crisp text
            jsPDF: { unit: 'mm', format: 'a7', orientation: 'portrait' } as any
        };

        // We specifically want a width closer to 80mm. 
        // Generates the PDF and saves it triggers download.
        // We will 'await' this so we can then open WhatsApp.

        // Dynamically import html2pdf to avoid SSR 'self is not defined' error
        // @ts-ignore
        const html2pdf = (await import("html2pdf.js")).default;

        await html2pdf().set(opt).from(element).save();

        // 6. Open WhatsApp
        const message = `¡Hola *${sale.customer.name}*! 👋%0A%0AGracias por tu compra en *${storeName}*.%0A%0AAdjunto encontrarás tu comprobante digital de la factura *${sale.invoiceNumber || 'N/A'}* por un valor de *$${Number(sale.total).toLocaleString('es-CO')}*.%0A%0A¡Feliz día!`;

        const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
        window.open(whatsappUrl, '_blank');

    } catch (error) {
        console.error("Error sharing receipt:", error);
        alert("Ocurrió un error al preparar el envío por WhatsApp.");
    }
}
