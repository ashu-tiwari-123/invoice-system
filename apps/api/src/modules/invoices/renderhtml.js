// apps/api/src/modules/invoices/renderHtml.js

function fmtINR(n) {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(v);
}
function fmt2(n) {
  return Number(n || 0).toFixed(2);
}
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
function wordsINR(num) {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const two = (n) =>
    n < 20
      ? a[n]
      : `${b[Math.floor(n / 10)]}${n % 10 ? " " + a[n % 10] : ""}`.trim();
  const three = (n) => {
    let s = "";
    const h = Math.floor(n / 100),
      r = n % 100;
    if (h) s += a[h] + " Hundred";
    if (r) s += (s ? " " : "") + two(r);
    return s;
  };
  const n = Math.round(Number(num || 0));
  if (n === 0) return "Zero Rupees Only";
  let x = n;
  const cr = Math.floor(x / 10000000);
  x %= 10000000;
  const lk = Math.floor(x / 100000);
  x %= 100000;
  const th = Math.floor(x / 1000);
  x %= 1000;
  const hd = x;
  const out = [];
  if (cr) out.push(three(cr) + " Crore");
  if (lk) out.push(three(lk) + " Lakh");
  if (th) out.push(three(th) + " Thousand");
  if (hd) out.push(three(hd));
  return out.join(" ").replace(/\s+/g, " ").trim() + " Rupees Only";
}

function computeSummary(invoice) {
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  let totalCgst = 0,
    totalSgst = 0,
    totalIgst = 0;
  const byRate = new Map();
  items.forEach((it) => {
    const qty = Number(it.quantity || 0),
      rate = Number(it.rate || 0),
      disc = Number(it.discount || 0);
    const taxable = Number(it.taxableValue ?? Math.max(0, qty * rate - disc));
    const cg = Number(it.cgstAmount || 0),
      sg = Number(it.sgstAmount || 0),
      ig = Number(it.igstAmount || 0);
    const r =
      Number(it.cgstRate || 0) +
        Number(it.sgstRate || 0) +
        Number(it.igstRate || 0) || Number(it.gstRate || 0);
    totalCgst += cg;
    totalSgst += sg;
    totalIgst += ig;
    const prev = byRate.get(r) || { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    prev.taxable += taxable;
    prev.cgst += cg;
    prev.sgst += sg;
    prev.igst += ig;
    byRate.set(r, prev);
  });
  const rows = [...byRate.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([rate, v]) => ({ rate: Number(rate), ...v }));
  const fallbackSubtotal = rows.reduce((s, r) => s + r.taxable, 0);
  const subtotal = Number(invoice?.taxableValue ?? fallbackSubtotal);
  const taxTotal = Number(
    invoice?.totalTax ??
      Number(invoice?.totalCgst || 0) +
        Number(invoice?.totalSgst || 0) +
        Number(invoice?.totalIgst || 0) ??
      totalCgst + totalSgst + totalIgst
  );
  const grand = Number(invoice?.grandTotal ?? subtotal + taxTotal);
  const rounded = Math.round(grand);
  const roundOff = Number((rounded - grand).toFixed(2));
  return {
    rows,
    totals: {
      subtotal,
      totalCgst: Number(invoice?.totalCgst ?? totalCgst),
      totalSgst: Number(invoice?.totalSgst ?? totalSgst),
      totalIgst: Number(invoice?.totalIgst ?? totalIgst),
      taxTotal,
      grand,
      rounded,
      roundOff,
    },
  };
}

export function renderInvoiceHtml(invoice) {

  const seller = invoice?.seller || {};
  const buyer = invoice?.buyer || {};
  const company = invoice?.companyId || {};
  const shipTo = invoice?.shipTo || {};
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const { rows: taxRows, totals } = computeSummary(invoice);
  const showIGST = (totals.totalIgst || 0) > 0;

  const css = `
    @page { size: A4; margin: 0; }
    *{ box-sizing: border-box; }
    html,body{ width:210mm; height:100vh; }
   body {
  margin:0;
  background:#fff;
  color:#111;
  font: 11px/1.35 'Roboto', Arial, sans-serif;  /* force Roboto everywhere */
  -webkit-font-smoothing:antialiased;
}
-webkit-font-smoothing:antialiased; }
   .watermark {
  position:absolute;
  top:50%;
  left:50%;
  transform:translate(-50%, -50%) rotate(-30deg); /* diagonal tilt */
  font-size:40px;
  font-weight:700;
  color:rgba(0,0,0,0.08); /* light muted grey */
  white-space:nowrap;
  z-index:0;  /* behind other elements */
  pointer-events:none;
}
.sheet {
  position:relative; /* ensure watermark positions inside the sheet */
}
    .sheet{
  width:210mm; height:297mm; padding:10mm;
  display:flex;              /* NEW */
  flex-direction:column;     /* NEW */
}
.bottom{                      /* NEW */
  margin-top:auto;           /* pushes this block to the bottom when space remains */
}

    /* header */
    .hdr{ position:relative; text-align:center; margin-bottom:6mm; }
    .hdr h1{ margin:0 0 2mm; font-weight:700; }
    .hdr .sub{ color:#444; }
    .hdr .badge{ position:absolute; right:0; top:0; text-align:right; }
    .pill{ display:inline-block; padding:2px 6px; border:1px solid #bbb; border-radius:3px; font-weight:700; color:#666; font-size:10px; margin-bottom:2mm; }
    .inv{ font-size:23px; font-weight:800; letter-spacing:.4px; }

    /* meta 4col */
    .meta{ width:100%; border-collapse:collapse; #bbb; border-top:1px solid #dbdbdb; table-layout:fixed; margin-bottom:6mm; }
    .meta td{  padding:3mm 2.5mm; text-align:center; }
    .lbl{ display:block; text-transform:uppercase; color:#666; font-size:10px; margin-bottom:1mm; letter-spacing:.2px; }
    .val{ font-weight:600; color:#111; }

    /* bill/ship cards */
    .twocol{ display:grid; grid-template-columns:1fr 1fr; gap:6mm; margin-bottom:6mm; }
    .card{ }
    .card h4{ margin:0 0 2mm; text-transform:uppercase; color:#666; font-size:12px; font-weight:700; letter-spacing:.2px; }
    .name{ font-size:15px; font-weight:700; color:#111; margin-bottom:1mm; }
    .muted{ margin:5px 0px ;color:#111010; }

    /* items */
    table.items{ width:100%; border-collapse:collapse; border:1px solid #888; table-layout:fixed; margin-bottom:6mm; }
    table.items th, table.items td{ border:1px solid #888; padding:2.6mm 2.2mm; }
    table.items thead th{ background:#f1f1f1; text-transform:uppercase; color:#1f2937; font-size:10px; letter-spacing:.2px; text-align:center; }
    .num{ text-align:right; } .ctr{ text-align:center; }
    table.items tr{font-weight:500;}

    /* summary + totals row */
    .row {  border-top:1px solid #bbb; display:grid; grid-template-columns: 1fr 1fr; gap:6mm; margin-bottom:4mm; }
    .row > .totals, .row > table.totals { align-self:start; }
    table.summary{ width:100%; border-collapse:collapse; border:1px solid #888; }
    table.summary th, table.summary td{ border:1px solid #888; padding:2.6mm 2.2mm; }
    table.summary thead th { background:#f1f1f1; text-transform:uppercase; font-size:10px; }
    .tfoot{ background:#f1f1f1; text-transform:uppercase; font-size:10px; }
    table.summary td:first-child{ text-align:left; }
    table.summary td{ text-align:right; }
    table.summary .ctr{ text-align:center; }

   .rcol{ 
  display:flex;
}
.rcol .totals{
  width:100%;
  border-collapse:separate;     /* no outer box, like your SS */
  border-spacing:0;
  display:flex;                 /* allows pushing the last row down */
  flex-direction:column;
}
.rcol .totals tbody{
  display:flex;
  flex-direction:column;
  height:100%;
  margin-top:50px;
}
.rcol .totals tbody tr{
  display:flex;
  justify-content:space-between;
  gap:8mm;                      /* keeps label/amount apart */
}
.rcol .totals td{
  padding:1.6mm 1.2mm;
}
.rcol .totals tr td:first-child{ text-align:left; }
.rcol .totals tr td:last-child{ text-align:right; }

/* Push the Grand Total row to the bottom and style like the SS */
.rcol .totals tr.grand{
  margin-top:auto;              /* pins to bottom of the band */
  border-top:1px solid #bbb;    /* muted rule above */
}
.rcol .totals tr.grand td{
  font-weight:700;
  font-size:13px;
  padding-top:2.2mm;            /* little breathing room after the rule */
}
.rcol .totals tr.grand td:last-child{
  font-size:14px;               /* slightly bigger amount */
  font-weight:700;
}

/* Center TAX SUMMARY text (you already added this) */
.section-head{
  font-weight:700;
  font-size:11px;
  color:#444;
  text-transform:uppercase;
  margin:0 0 2mm;
  padding-top:2mm;
  text-align:center;
  letter-spacing:.2px;
}
    .words{ border-top:1px solid #bbb; padding-top:3mm; margin-bottom:4mm; font-weight:700; }
    .section-head{
  font-weight:700;
  font-size:11px;
  color:#444;
  text-transform:uppercase;
  margin:0 0 2mm;
  padding-top:2mm;
  text-align:center;            /* NEW */
  letter-spacing:.2px;
}
  .decl{ display:flex;flex-direction:column; gap:10px; }
  .decl-text{
  font-size:12px;
  font-weight:700;
  margin:0 0 0mm;}
    .foot{ border-top:1px solid #bbb; padding-top:4mm; display:grid; grid-template-columns:1fr 1fr; gap:8mm; }
    .bank-text{font-weight:500; margin:1px 0px; color:#111010;}
   .sign{
  display:flex;
  flex-direction:column;
  align-items:center;       /* center inside the right column */
  justify-content:space-around;
  min-height:42mm;          /* gives breathing room similar to SS */
}

/* "For GIFT PLUS" heading */
.for-co{
  font-weight:700;
  text-transform:uppercase;
  text-align:center;
  margin-top:0;
  margin-bottom:12mm;       /* space above the signature line like SS */
}

/* Signature line + label (you already had these, tweaks for spacing) */
.signwrap{ text-align:center; width:100%; }
.sigline{ margin:0 auto 2mm; border-top:1px solid #bbb; width:70mm; }
.siglbl{ color:#444; font-size:11px; }
    .end{ border-top:1px solid #e5e7eb; margin-top:6mm; padding-top:2mm; display:flex; justify-content:space-between; color:#666; font-size:10px; }
  `;

  const itemRows = items
    .map((it, idx) => {
      const qty = Number(it.quantity || 0),
        rate = Number(it.rate || 0),
        disc = Number(it.discount || 0);
      const taxable = Number(it.taxableValue ?? Math.max(0, qty * rate - disc));
      return `
      <tr>
        <td class="ctr" style="width:6%">${idx + 1}.</td>
        <td style="width:36%">${it.description || it.name || "—"}</td>
        <td class="ctr" style="width:10%">${it.hsn || "—"}</td>
        <td class="ctr" style="width:8%">${qty}</td>
        <td class="ctr" style="width:8%">${it.unit || it.per || "—"}</td>
        <td class="num" style="width:12%">${fmt2(rate)}</td>
        <td class="num" style="width:10%">${disc > 0 ? fmt2(disc) : "-"}</td>
        <td class="num" style="width:10%">${fmt2(taxable)}</td>
      </tr>`;
    })
    .join("");

  const taxHead = showIGST
    ? `<tr><th>Taxable Value</th><th>IGST %</th><th>IGST Amount</th></tr>`
    : `<tr><th>Taxable Value</th><th>CGST %</th><th>Amount</th><th>SGST %</th><th>Amount</th></tr>`;

  const taxRowsHtml = taxRows
    .map((r) =>
      showIGST
        ? `<tr><td>${fmt2(r.taxable)}</td><td class="ctr">${fmt2(r.rate)}%</td><td>${fmt2(r.igst)}</td></tr>`
        : `<tr><td>${fmt2(r.taxable)}</td><td class="ctr">${fmt2(r.rate / 2)}%</td><td>${fmt2(r.cgst)}</td><td class="ctr">${fmt2(r.rate / 2)}%</td><td>${fmt2(r.sgst)}</td></tr>`
    )
    .join("");

  const taxFoot = showIGST
    ? `<tr><td><strong>${fmt2(totals.subtotal)}</strong></td><td></td><td><strong>${fmt2(totals.totalIgst)}</strong></td></tr>`
    : `<tr><td><strong>${fmt2(totals.subtotal)}</strong></td><td></td><td><strong>${fmt2(totals.totalCgst)}</strong></td><td></td><td><strong>${fmt2(totals.totalSgst)}</strong></td></tr>`;

  const companyName = (company.name || seller.name || "").toString();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${invoice?.invoiceNo || "Invoice"}</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
  <div class="sheet">

    <!-- Header -->
    <div class="hdr">
      <h1>${companyName || ""}</h1>
      ${seller.address ? `<div class="sub">${seller.address}</div>` : ""}
      ${seller.email || seller.phone ? `<div class="sub">${seller.email ? `Email: ${seller.email}` : ""}${seller.email && seller.phone ? " | " : ""}${seller.phone ? `Mob: ${seller.phone}` : ""}</div>` : ""}
      ${seller.gstin ? `<div class="sub">GSTIN: <strong>${seller.gstin}</strong></div>` : ""}
      <div class="badge">
        <div class="pill">${invoice?.invoiceType}</div>
        <div class="inv">INVOICE</div>
      </div>
    </div>

    <!-- Meta strip -->
    <table class="meta">
      <tr>
        <td><span class="lbl">Invoice No.</span><span class="val">${invoice?.invoiceNo || "—"}</span></td>
        <td><span class="lbl">Invoice Date</span><span class="val">${fmtDate(invoice?.invoiceDate)}</span></td>
        <td><span class="lbl">P.O. Number</span><span class="val">${invoice?.poNo || "—"}</span></td>
        <td><span class="lbl">Place of Delivery</span><span class="val">${invoice?.placeOfDelivery || "—"}</span></td>
      </tr>
    </table>

    <!-- Bill/Ship -->
    <div class="twocol">
      <div class="card">
        <h4>Bill To</h4>
        <div class="name">${buyer.name || "—"}</div>
        <div class="muted">${buyer.address || "—"}</div>
        <div class="muted">${buyer.state || ""}${buyer.pinCode || buyer.pincode ? " - " + (buyer.pinCode || buyer.pincode) : ""}</div>
        ${buyer.phone ? `<div class="muted">Phone: ${buyer.phone}</div>` : ""}
        ${buyer.gstin ? `<div>GSTIN: <strong>${buyer.gstin}</strong></div>` : ""}
        ${buyer.pan ? `<div>PAN: <strong>${buyer.pan}</strong></div>` : ""}
      </div>
      <div class="card">
        <h4>Ship To</h4>
        <div class="name">${shipTo.name || buyer.name || "—"}</div>
        <div class="muted">${shipTo.address || buyer.address || "—"}</div>
        <div class="muted">${shipTo.state || buyer.state || ""}</div>
        ${shipTo.gstin ? `<div>GSTIN: <strong>${shipTo.gstin}</strong></div>` : ""}
      </div>
    </div>

    <!-- Items -->
    <table class="items">
      <thead>
        <tr>
          <th style="width:6%">S.NO</th>
          <th style="width:36%; text-align:left">DESCRIPTION</th>
          <th style="width:10%">HSN/SAC</th>
          <th style="width:8%">QTY</th>
          <th style="width:8%">UNIT</th>
          <th style="width:12%" class="num">RATE</th>
          <th style="width:10%" class="num">DISCOUNT</th>
          <th style="width:10%" class="num">AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows || `<tr><td class="ctr" colspan="8">No items</td></tr>`}
      </tbody>
    </table>

    <div class="bottom">
    <!-- Summary + Totals -->
<div class="row">
  <!-- LEFT column -->
  <div class="col">
    <div class="section-head">TAX SUMMARY</div>
    <table class="summary">
      <thead>${taxHead}</thead>
      <tbody>${taxRowsHtml}</tbody>
      <tfoot class="tfoot">${taxFoot}</tfoot>
    </table>
  </div>

  <div class="rcol">
  <table class="totals">
    <tbody>
      <tr><td>Taxable Value</td><td>${fmt2(totals.subtotal)}</td></tr>
      <tr><td>Total Tax</td><td>${fmt2(totals.taxTotal)}</td></tr>
      ${totals.roundOff !== 0 ? `<tr><td>Round Off</td><td>${fmt2(totals.roundOff)}</td></tr>` : ""}
      <tr class="grand"><td>Grand Total</td><td>${fmtINR(totals.rounded)}</td></tr>
    </tbody>
  </table>
</div>
</div>


    <!-- Amount in words -->
    <div class="words"><span>Amount in Words:</span> ${wordsINR(totals.rounded)}</div>

    <!-- Footer blocks -->
    <div class="foot">
      <div class="decl"> 
      <div class="bank">
        <p class="decl-text">Bank Details</p>
        <div class="bank-text">Bank: ${seller.bankName || "—"}</div>
        <div class="bank-text">Branch: ${seller.branch || seller.branchName || "—"}</div>
        <div class="bank-text">A/C No: ${seller.accountNumber || seller.accountNo || "—"}</div>
        <div class="bank-text">IFSC: ${seller.ifsc || seller.ifscCode || "—"}</div>
      </div>
      <div>
         <p class="decl-text">Declaration</p>
        <em>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</em>
        </div></div>

      <!-- Right column: Signatory -->
<div class="sign">
  <div class="for-co">For ${companyName || "—"}</div>
  <div class="signwrap">
    <div class="sigline"></div>
    <div class="siglbl">Authorised Signatory</div>
  </div>
</div>

    </div>

    <div class="end">
      <span>This is a computer generated invoice.</span>
      <span>E. &amp; O.E</span>
    </div></div>
  </div>
</body>
</html>`;
}
