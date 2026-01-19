import { getReceiptData } from "../actions";

export async function printReceipt(saleId: string) {
    try {
        const { sale, organization } = await getReceiptData(saleId);

        if (!sale || !organization) {
            alert("No se pudieron cargar los datos para imprimir.");
            return;
        }

        const width = 300; // Standard thermal paper width approx
        const printWindow = window.open('', '', 'width=400,height=600');

        if (!printWindow) {
            alert("Por favor habilita las ventanas emergentes para imprimir.");
            return;
        }

        const dateFormatted = new Date(sale.date).toLocaleDateString("es-CO", {
            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
        });

        const itemsHtml = sale.instances.map((item: any) => {
            // Grouping Logic if needed. 
            // In Latidos 'instances' are individual items. 
            // Receipts usually show Qty based on Product Name.
            // We should probably group by product name in the receipt logic or server side.
            // Let's do it here for simplicity.
            return item;
        });

        // Group by product name for the receipt
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
                <td style="text-align: center; vertical-align: top;">${item.count}</td>
                <td style="text-align: left;">
                    ${item.name}
                    ${item.serials.length > 0 ? `<br/><span style="font-size: 9px; color: #555;">S/N: ${item.serials.join(', ')}</span>` : ''}
                </td>
                <td style="text-align: right; vertical-align: top;">$${(item.price * item.count).toLocaleString('es-CO')}</td>
            </tr>
        `).join('');

        const logoHtml = organization.logoUrl
            ? `<img src="${organization.logoUrl}" alt="Logo" style="max-width: 150px; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto;" />`
            : '';

        const showNit = organization.nit && organization.nit !== "000000000" && organization.nit !== "---" && organization.nit.trim() !== "";
        const nitHtml = showNit ? `NIT: ${organization.nit}<br/>` : '';
        const phoneHtml = organization.phone ? `WhatsApp: ${organization.phone}` : '';
        const footerHtml = organization.footerMsg ? `<br/><p style="text-align: center; font-size: 10px; margin-top: 10px;">${organization.footerMsg}</p>` : `<br/><p style="text-align: center; font-size: 10px; margin-top: 10px;">GRACIAS POR ELEGIRNOS, SEGUIMOS CRECIENDO JUNTOS.</p>`;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Imprimir Recibo</title>
                <style>
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 12px;
                        margin: 0;
                        padding: 10px;
                        width: 100%;
                        max-width: 300px; /* Thermal width constraint */
                    }
                    .header {
                        text-align: center;
                        border-bottom: 1px dashed #000;
                        padding-bottom: 10px;
                        margin-bottom: 10px;
                    }
                    .info {
                        margin-bottom: 10px;
                        border-bottom: 1px dashed #000;
                        padding-bottom: 10px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 10px;
                    }
                    th {
                        text-align: left;
                        border-bottom: 1px solid #000;
                        padding: 5px 0;
                        font-size: 10px;
                    }
                    td {
                        padding: 5px 0;
                    }
                    .totals {
                        border-top: 1px dashed #000;
                        padding-top: 5px;
                        text-align: right;
                        font-weight: bold;
                        font-size: 14px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        border-top: 1px dashed #000; /* Separator before footer */
                        padding-top: 10px;
                    }
                    @media print {
                        @page {
                            margin: 0;
                        }
                        body {
                            padding: 0 5px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    ${logoHtml}
                    <strong>${organization.name || "Mi Negocio"}</strong><br/>
                    ${nitHtml}
                    ${phoneHtml}
                </div>

                <div class="info">
                    Factura N°: ${sale.invoiceNumber || "Pendiente"}<br/>
                    Fecha: ${dateFormatted}<br/>
                    Cliente: ${sale.customer.name}<br/>
                    ${sale.customer.phone ? `Tel: ${sale.customer.phone}<br/>` : ''}
                    ${sale.customer.address ? `Dir: ${sale.customer.address}<br/>` : ''}
                    ${sale.customer.sector ? `Zona: ${sale.customer.sector}` : ''}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 10%; text-align: center;">CANT.</th>
                            <th style="width: 55%;">DESCRIPCIÓN</th>
                            <th style="width: 35%; text-align: right;">SUBTOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>

                <div class="totals">
                    TOTAL A PAGAR (COP): <br/>
                    $${Number(sale.total).toLocaleString('es-CO')}
                </div>

                ${footerHtml}

                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500); 
                    }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();

    } catch (error) {
        console.error("Error al imprimir:", error);
        alert("Ocurrió un error preparando la impresión.");
    }
}
