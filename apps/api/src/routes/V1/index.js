import express from "express";
import userRoutes from "../user.routes.js";
import catalogRoutes from "../catalog.routes.js";

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
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
