import express from "express";
import userRoutes from "../../modules/users/user.routes.js";
import catalogRoutes from "../../modules/catalog/catalog.routes.js";
import invoice from "../../modules/invoices/invoice.routes.js";
import company from "../../modules/company/company.routes.js";
import quotation from "../../modules/quotations/quotation.route.js";
import expense from "../../modules/expenses/expenses.routes.js";
import purchase from "../../modules/purchase/purchase.routes.js";
import report from "../../modules/reports/reports.routes.js";
import pdf from "../../modules/invoices/invoice.pdf.routes.js";
import quote from "../../modules/quotations/quotation.pdf.route.js";

const router = express.Router();

const defaultRoutes = [
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/catalog",
    route: catalogRoutes,
  },
  {
    path: "/invoices",
    route: invoice,
  },
  {
    path: "/company",
    route: company,
  },
  {
    path: "/quotations",
    route: quotation,
  },
  {
    path: "/expenses",
    route: expense,
  },
  {
    path: "/purchases",
    route: purchase,
  },
  {
    path: "/reports",
    route: report,
  },
  {
    path: "/create-pdf",
    route: pdf,
  },
  {
    path: "/create-quote",
    route: quote,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
