import User from "./user.schema.js";
import ApiError from "../../utils/ApiError.js";

export const getOrCreateCurrentUser = async (req, res, next) => {
  try {
    const { uid, email, name } = req.user;

    let user = await User.findOne({ firebaseUid: uid });
    let created = false;

    if (!user) {
      user = new User({
        firebaseUid: uid,
        email,
        displayName: name || (email ? email.split("@")[0] : "User"),
      });
      await user.save();
      created = true;
    }

    user.lastLogin = new Date();
    await user.save();

    const payload = user.toObject();
    payload.needsCompanyLink = !user.companyId;

    res.status(created ? 201 : 200).json(payload);
  } catch (error) {
    next(error);
  }
};

export const updateCurrentUser = async (req, res, next) => {
  try {
    const { uid } = req.user;
    const { displayName, phoneNumber } = req.body;

    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    if (displayName !== undefined) {
      user.displayName = displayName;
    }
    if (phoneNumber !== undefined) {
      user.phoneNumber = phoneNumber;
    }
    if (req.body.photoURL !== undefined) {
      user.photoURL = req.body.photoURL;
    }

    const updatedUser = await user.save();

    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
};
