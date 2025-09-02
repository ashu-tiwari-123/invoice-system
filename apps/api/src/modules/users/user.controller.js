import User from "./user.schema.js";
import ApiError from "../../utils/ApiError.js";

export const getOrCreateCurrentUser = async (req, res, next) => {
  try {
    const { uid, email, name } = req.user;

    let user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      user = new User({
        firebaseUid: uid,
        email: email,
        displayName: name || email.split("@")[0],
      });
      await user.save();
      return res.status(201).json(user);
    }
    user.lastLogin = new Date();
    await user.save();
    res.status(200).json(user);
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

    const updatedUser = await user.save();

    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
};
