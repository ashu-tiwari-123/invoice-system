import { auth as firebaseAuth } from "../config/firebase.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.schema.js";

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new ApiError(401, "Unauthorized: No token provided"));
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);

    // Find the user in your own database
    const user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      // This case is handled by the user controller's getOrCreateUser function.
      // For most protected routes, you'd want to ensure the user exists.
      // We'll let it pass here so the controller can create the user.
    }

    req.user = decodedToken; // Attach decoded token info to the request
    req.dbUser = user; // Attach your DB user record to the request

    next();
  } catch (error) {
    if (error.code === "auth/id-token-expired") {
      return next(new ApiError(401, "Unauthorized: Token expired"));
    }
    return next(new ApiError(401, "Unauthorized: Invalid token"));
  }
};

export default authMiddleware;
