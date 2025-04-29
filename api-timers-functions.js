import { db } from "./firebase-config.js";
import { ref, get, query, push, update, child, orderByChild, equalTo } from "firebase/database";

export const getUserTimers = async (user_id) => {
  try {
    const userTimers = await get(query(ref(db, "timers"), orderByChild("user_id"), equalTo(user_id)));
    if (!userTimers.exists()) {
      return [];
    }
    const timers = Object.values(userTimers.val());
    timers.map((t) => {
      // t.start = +t.start;
      // t.end = t.end ? +t.end : t.end;
      if (t.isActive === true) {
        t.progress = Date.now() - t.start;
      }
      return t;
    });
    return {
      activeTimers: timers.filter((n) => n.isActive),
      oldTimers: timers.filter((n) => !n.isActive),
    };
  } catch (err) {
    console.error("getUserTimers", err);
  }
};

export const stopTimer = async (timerId) => {
  try {
    const timerFromBase = await get(child(ref(db), `timers/${timerId}`));

    if (!timerFromBase.exists()) {
      // return res.sendStatus(204);
      return;
    }

    const updateTimer = timerFromBase.val();

    updateTimer.isActive = false;
    updateTimer.end = Date.now();
    updateTimer.duration = updateTimer.end - updateTimer.start;

    const updates = {};
    updates[`/timers/${timerId}`] = updateTimer;

    update(ref(db), updates);
    return updateTimer;
  } catch (err) {
    console.error("Ошибка при остановке таймера:", err);
  }
};

export const startTimer = async (user_id, description) => {
  try {
    if (!description) {
      // return res.status(404).send("Описание обзательно");
    }

    const timer = {
      start: Date.now() - 1000,
      description,
      isActive: true,
      user_id,
    };

    const newTimerKey = push(child(ref(db), "timers")).key;
    timer.id = newTimerKey;
    const updates = {};
    updates[`/timers/${newTimerKey}`] = timer;
    timer.progress = 0;

    update(ref(db), updates);
    return timer;
  } catch (err) {
    console.error(err);
  }
};
