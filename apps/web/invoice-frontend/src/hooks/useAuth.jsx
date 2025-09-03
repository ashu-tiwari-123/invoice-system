import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { setUser, clearUser, setLoading } from "../app/slices/authSlice";

function useAuth() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setLoading(true));

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        dispatch(
          setUser({ user: { uid: user.uid, email: user.email }, token })
        );
        localStorage.setItem("token", token);
      } else {
        dispatch(clearUser());
        localStorage.removeItem("token");
      }
      dispatch(setLoading(false));
    });

    return () => unsubscribe();
  }, [dispatch]);
}

export default useAuth;
