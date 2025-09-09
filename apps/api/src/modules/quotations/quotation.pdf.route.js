import express from "express";
import puppeteer from "puppeteer";
import authMiddleware from "../../middlewares/auth.js";
import Quotation from "./quotation.schema.js";
import ApiError from "../../utils/ApiError.js";
import { renderQuotationHtml } from "./renderhtml.js";

const router = express.Router();

// generate and download PDF
router.get("/:id/pdf", authMiddleware, async (req, res) => {
  let browser;
  try {
    const { id } = req.params;

    const quotation = await Quotation.findOne({
      _id: id,
      companyId: req.user.companyId,
    }).lean();
    if (!quotation) throw new ApiError(404, "Quotation not found");

    const html = renderQuotationHtml(quotation);

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath?.(),
    });
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (reqq) => {
      const url = reqq.url();
      if (/googletagmanager|google-analytics|facebook|segment|hotjar/i.test(url))
        return reqq.abort();
      return reqq.continue();
    });

    // desktop A4 2x scale for crispness
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch {}
      }
      const imgs = Array.from(document.images || []);
      await Promise.all(
        imgs.map(
          (img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((res) => {
                  img.onload = img.onerror = () => res();
                })
        )
      );
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    if (!pdfBuffer?.byteLength) throw new ApiError(500, "PDF buffer empty");

    const filename = `${quotation.quotationNo || id}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", String(pdfBuffer.byteLength));
    return res.end(pdfBuffer);
  } catch (err) {
    console.error("Puppeteer Quotation PDF error:", err);
    if (!res.headersSent) {
      res.status(err.statusCode || 500).json({
        message: err.message || "Failed generating PDF",
      });
    }
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
});

// preview HTML (same template) — useful for debugging/design
router.get("/:id/pdf-preview", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const quotation = await Quotation.findOne({
      _id: id,
      companyId: req.user.companyId,
    }).lean();

    if (!quotation) throw new ApiError(404, "Quotation not found");

    const html = renderQuotationHtml(quotation);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    next(err);
  }
});

export default router;
