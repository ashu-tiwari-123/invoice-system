function fmt2(n) {
  return Number(n || 0).toFixed(2);
}
function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt)
    ? ""
    : dt.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}
function safe(v) {
  return v === undefined || v === null ? "" : String(v);
}

export function renderQuotationHtml(q) {
  const seller = q?.companyId || {};
  const buyer = q?.customer || {};
  const items = Array.isArray(q?.items) ? q.items : [];

  const cols =
    Array.isArray(q?.customColumns) && q.customColumns.length
      ? q.customColumns
      : [{ key: "rate", label: "Rate" }, { key: "total", label: "Total" }];

  // compute row total robustly (prefer explicit total if present)
  const computeRowTotal = (it) => {
    const c = it?.columns || {};
    const explicit = Number(c.total);
    if (!Number.isNaN(explicit)) return explicit;
    const qty = Number(c.qty ?? c.quantity ?? c.QTY ?? 0) || 0;
    const price =
      Number(c.price ?? c.rate ?? c.unitPrice ?? c.sellPrice ?? 0) || 0;
    const discount = Number(c.discount ?? 0) || 0;
    return Number(qty * price - discount) || 0;
  };

  const rowTotals = items.map((it) => computeRowTotal(it));

  // grand total: prefer explicit q.total if valid, otherwise sum of row totals
  const explicitGrand = Number(q?.total);
  const grandTotal =
    !Number.isNaN(explicitGrand) && q?.total !== null
      ? Number(q.total)
      : rowTotals.reduce((s, v) => s + (Number(v) || 0), 0);

  const css = `
      @page {
        size: Letter;
      }
      @font-face {
        font-family: 'Cambria';
        src: url('/fonts/Cambria.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
      }

      html, body {
        margin: 0;
        font-family: 'Cambria', 'Times New Roman', serif;
        font-size: 11pt;
        color: #111;
      }
      .space { margin-top:18px; }
      .space1 { margin-top:16px; }
      .page {
        padding-top: 2.2cm; /* margin + header space */
        padding-left: 1.27cm;
        padding-right: 1.27cm;
        padding-bottom: 1.27cm;
      }

      h1 { font-size:14pt; font-weight:bold; margin:0; color:#1a3c7c; }
      .gstin { font-size:11pt; margin-top:2px; }

      .to-block { line-height:1.4; width:60%; }
      .subject { font-weight:bold; color:#2b5f9e; }
      .intro {}

      table { width:100%; border-collapse:collapse; margin-top:12px; }
      table th, table td {
        border:1px solid #000;
        padding:15px 8px;
        text-align:center;
        font-size:11pt;
      }
      table th { background:#f2f4f9; font-weight:bold; }
      table td.left { text-align:center; }

      .terms { font-size:11pt; margin-top:50px; }
      .terms b { color:#2b5f9e; display:block; margin-bottom:6px; font-size:13pt }
      .terms ul { margin:0; padding-left:20px; }
      .terms ul li { margin-bottom:15px; line-height:1.35; }

      .closing { margin-top:35px; line-height:1.4; }
      .date { margin-top:10px; font-size:11pt; }
  `;

  const head = `
    <tr>
      <th style="width:8%">S. No</th>
      <th style="text-align:center">Item</th>
      ${cols.map((c) => `<th>${safe(c.label)}</th>`).join("")}
    </tr>
  `;

  const rows = items
    .map((it, idx) => {
      const rowTotal = computeRowTotal(it);
      const colsHtml = cols
        .map((c) => {
          const raw = it.columns?.[c.key];
          const num = Number(raw);
          // For "total" column prefer computed rowTotal when explicit missing
          if (c.key === "total") {
            const explicit = it.columns && it.columns.total !== undefined ? Number(it.columns.total) : NaN;
            const valueToShow = !Number.isNaN(explicit) ? explicit : rowTotal;
            return `<td style="text-align:center;font-weight:bold;">${fmt2(valueToShow)}</td>`;
          }
          // for other columns: show numeric formatted if it's truly numeric, otherwise safe string
          if (!Number.isNaN(num) && raw !== "" && raw !== null) {
            return `<td>${fmt2(num)}</td>`;
          }
          return `<td>${safe(raw)}</td>`;
        })
        .join("");

      return `
        <tr>
          <td>${idx + 1}</td>
          <td class="left">${safe(it.item)}</td>
          ${colsHtml}
        </tr>
      `;
    })
    .join("");

  // decide whether to render total row:
  // show if explicit q.total present OR any total column exists OR computed grandTotal > 0
  const hasTotalCol = cols.some((c) => c.key === "total");
  const shouldShowTotalRow =
    (!Number.isNaN(Number(q?.total)) && q?.total !== null) ||
    hasTotalCol ||
    (grandTotal && Number(grandTotal) > 0);

  const totalRow = shouldShowTotalRow
    ? `
      <tr>
        <td colspan="${cols.length + 1}" style="text-align:center;font-weight:bold;">Grand Total</td>
        <td style="text-align:right;font-weight:bold;">${fmt2(grandTotal)}</td>
      </tr>
    `
    : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${q.quotationNo || "Quotation"}</title>
<style>${css}</style>
</head>
<body>
  <div class="page">

    <h1>${safe(seller.name || "GIFT PLUS")}</h1>
    ${
      seller.gstin
        ? `<div class="gstin">GSTIN: ${safe(seller.gstin)}</div>`
        : `<div class="gstin">GSTIN: 29BXCPT1687G1ZZ</div>`
    }
    <div class="to-block space">
      <div><b>To:</b></div>
      <div class="space1"><b>${safe(buyer.name || "")}</b></div>
      <div>${safe(buyer.company || "")}</div>
      <div>${safe(buyer.address || "")}</div>
      ${
        buyer.state
          ? `<div>${safe(buyer.state)} ${
              buyer.stateCode ? "(" + buyer.stateCode + ")" : ""
            }</div>`
          : ""
      }
    </div>
    <div class="subject space">Subject: ${safe(q.subject || "Quotation")}</div>

    <div class="intro space1">Dear Sir,</div>
    <div class="intro">We are grateful for your interest and confidence in our products and services. Please find below our proposal:</div>

    <table>
      <thead>${head}</thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="terms">
      <b>Terms & Conditions</b>
      <ul>
        ${
          q.termsAndConditions && q.termsAndConditions.length
            ? q.termsAndConditions.map((t) => `<li>${safe(t)}</li>`).join("")
            : `<li>GST @12% applicable on the total amount.</li>
               <li>Price includes branding and single location delivery in Bangalore.</li>
               <li>Payment against delivery.</li>`
        }
      </ul>
    </div>

    <div class="closing">
      <div>We hope this quotation meets your expectations. We look forward to your valuable order and the beginning of a long-term business relationship.</div>
      <br/>
      <div>Thanks & Regards</div>
      <div><b>${safe(seller.contactName || "Ashutosh")}</b></div>
      <div>${safe(seller.name || "GIFT PLUS")}</div>
    </div>

    <div class="date">Date: ${fmtDate(q.date) || fmtDate(new Date())}</div>

  </div>
</body>
</html>`;
}
