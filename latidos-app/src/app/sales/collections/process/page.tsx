import { MassCollection } from "../MassCollection";
import { getCustomerById } from "../actions";

export const metadata = {
    title: "Procesar Recaudo | LATIDOS",
    description: "Motor de pagos en cascada",
};

export default async function ProcessCollectionPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    let customerName = "";
    if (searchParams.customerId) {
        const customer = await getCustomerById(searchParams.customerId as string);
        if (customer) {
            customerName = `: ${customer.name}`;
        }
    }

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    Motor de Cobranzas<span className="text-blue-600">{customerName}</span>
                </h1>
                <p className="text-slate-500">Gestione abonos masivos y distribuya pagos en cascada.</p>
            </div>

            <MassCollection />
        </div>
    );
}
