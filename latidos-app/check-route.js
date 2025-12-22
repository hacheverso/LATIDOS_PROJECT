
// Native fetch in Node 18+


async function checkRoute() {
    try {
        console.log("Checking /api/inventory/export...");
        const res = await fetch('http://localhost:3000/api/inventory/export');
        console.log(`Status: ${res.status} ${res.statusText}`);
        if (res.status !== 200) {
            const txt = await res.text();
            console.log("Response:", txt.substring(0, 200));
        } else {
            console.log("Headers:", res.headers.get('content-type'));
        }
    } catch (e) {
        console.error("Fetch error:", e.message);
    }
}

checkRoute();
