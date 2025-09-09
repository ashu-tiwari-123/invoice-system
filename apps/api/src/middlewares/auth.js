// middlewares/auth.js
import { auth as firebaseAuth } from "../config/firebase.js";
import ApiError from "../utils/ApiError.js";
import User from "../modules/users/user.schema.js";

// src/middlewares/auth.js
const ONBOARD_ALLOW = [
  { method: "GET", path: "/api/v1/users/me" },
  { method: "PATCH", path: "/api/v1/users/me" },
  { method: "GET", path: "/api/v1/company" },  // allow to fetch (may 404)
  { method: "POST", path: "/api/v1/company" }, // allow to upsert/link
];

const isOnboardRoute = (req) =>
  ONBOARD_ALLOW.some(
    r => r.method === req.method && req.originalUrl.startsWith(r.path)
  );

const authMiddleware = async (req, _res, next) => {
  const authHeader = req.headers.authorization || "";
  if (!/^Bearer\s+/i.test(authHeader)) {
    return next(new ApiError(401, "Unauthorized: No token provided"));
  }
  const idToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  try {
    const decoded = await firebaseAuth.verifyIdToken(idToken);
    const dbUser = await User.findOne({ firebaseUid: decoded.uid })
      .select("_id companyId role email firebaseUid")
      .lean();

    // Always attach decoded basics
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
      role: dbUser?.role,
      _id: dbUser?._id,
      companyId: dbUser?.companyId,
    };

    // If user missing or no company link, allow only onboarding routes
    if (!dbUser) {
      if (isOnboardRoute(req)) return next();
      return next(new ApiError(403, "User not registered in the system"));
    }

    if (!dbUser.companyId) {
      if (isOnboardRoute(req)) return next();
      return next(new ApiError(403, "User is not linked to any company"));
    }

    return next();
  } catch (error) {
    if (error?.code === "auth/id-token-expired") {
      return next(new ApiError(401, "Unauthorized: Token expired"));
    }
    return next(new ApiError(401, "Unauthorized: Invalid token"));
  }
};

export default authMiddleware;
