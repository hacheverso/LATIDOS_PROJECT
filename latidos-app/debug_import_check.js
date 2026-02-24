const parseCurrency = (val) => {
    if (!val) return 0;
    if (val.toUpperCase().includes("NO VENDIDO")) return 0;
    let clean = val.replace(/[$\s#]/g, "");
    clean = clean.replace(/\./g, "");
    clean = clean.replace(",", ".");
    return parseFloat(clean) || 0;
};

const clean = (val) => val ? val.trim().replace(/^"|"$/g, '').replace(/""/g, '"') : "";

const simulateRow = (line, delimiter = ",") => {
    const cols = line.split(delimiter);
    console.log("Raw columns:", cols);

    const idxQty = 6;
    const rawQty = cols[idxQty];
    const cleanedQty = clean(rawQty);
    const parsedQty = parseInt(cleanedQty) || 0;

    console.log("------------------------");
    console.log("Raw Qty String:", `"${rawQty}"`);
    console.log("Cleaned Qty:", `"${cleanedQty}"`);
    console.log("Parsed Integer Qty:", parsedQty);
    console.log("------------------------");
};


console.log("TEST 1: Standard number");
simulateRow("IPAD 10TH GENERATION WIFI 64GB BLUE,194253387718,IPAD10WIFI64BU,IPAD,1130000,1050000, 5 ,https://url.com");

console.log("TEST 2: Empty number");
simulateRow("IPAD 10TH GENERATION WIFI 64GB BLUE,194253387718,IPAD10WIFI64BU,IPAD,1130000,1050000,,https://url.com");

console.log("TEST 3: Number with decimals");
simulateRow("IPAD 10TH GENERATION WIFI 64GB BLUE,194253387718,IPAD10WIFI64BU,IPAD,1130000,1050000,5.0,https://url.com");

console.log("TEST 4: String text");
simulateRow("IPAD 10TH GENERATION WIFI 64GB BLUE,194253387718,IPAD10WIFI64BU,IPAD,1130000,1050000,AGOTADO,https://url.com");
