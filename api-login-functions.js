import { createHash } from "crypto";
import { ref, get, query, push, update, child, remove, orderByChild, equalTo } from "firebase/database";
import { db, sessionLimit } from "./firebase-config.js";

export const hash = (password) =>
  createHash("md5")
    .update("username" + password)
    .digest("hex");

export const findUserByUsername = async (username) => {
  try {
    const user = await get(query(ref(db, "users"), orderByChild("username"), equalTo(username)));
    if (!user.exists()) {
      console.log("User not found by username");
      return;
    }
    return Object.values(user.val())[0];
  } catch (err) {
    console.error(err);
  }
};

export const findUserByUserId = async (id) => {
  try {
    const user = await get(query(ref(db, "users"), orderByChild("id"), equalTo(id)));
    if (!user.exists()) {
      console.log("User not found by id");
      return;
    }
    return Object.values(user.val())[0];
  } catch (err) {
    console.error(err);
  }
};

export const findUserByToken = async (token) => {
  try {
    const session = (await get(child(ref(db), `tokens/${token}`))).val();
    if (!session) {
      return;
    }

    const user = await get(child(ref(db), `users/${session}`));
    if (!user) {
      console.log("User not found by token");
      return;
    }
    return user.val();
  } catch (err) {
    console.error(err);
  }
};

export const createToken = async (userId) => {
  const token = push(child(ref(db), "tokens")).key;
  const updates = {};
  updates[`/tokens/${token}`] = userId;
  update(ref(db), updates);

  return token;
};

export const deleteToken = async (token) => {
  remove(ref(db, `tokens/${token}`));
};

export const signup = () => async (req, res) => {
  if (!req.body.username || !req.body.password) {
    return res.status(204).redirect("/?authError=true");
  }
  const { username, password } = req.body;
  const user = await findUserByUsername(username);

  if (user) {
    return res.status(204).redirect("/?signError=true");
  }

  const newUserKey = push(child(ref(db), "users")).key;
  const updates = {};

  updates[`/users/${newUserKey}`] = {
    id: newUserKey,
    username,
    password: hash(password),
  };
  update(ref(db), updates);

  res.status(201).redirect("/");
};

export const login = () => async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await findUserByUsername(username);

    if (!user || user.password !== hash(password)) {
      return res.redirect("/?authError=true");
    }

    const token = await createToken(user.id);

    setTimeout(() => {
      deleteToken(token);
    }, sessionLimit);

    res.cookie("token", token, { maxAge: sessionLimit }).redirect(`/`);
  } catch (err) {
    console.error(err);
  }
};

export const logout = () => async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/");
    }

    await deleteToken(req.token);
    res.clearCookie("token").redirect("/");
  } catch (err) {
    console.error(err);
  }
};
