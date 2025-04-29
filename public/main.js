/*global UIkit, Vue */

(() => {
  const notification = (config) =>
    UIkit.notification({
      pos: "top-right",
      timeout: 5000,
      ...config,
    });

  const alert = (message) =>
    notification({
      message,
      status: "danger",
    });

  const info = (message) =>
    notification({
      message,
      status: "success",
    });

  new Vue({
    el: "#app",
    data: {
      desc: "",
      activeTimers: [],
      oldTimers: [],
    },
    client: null,

    methods: {
      getActiveTimers(data) {
        this.activeTimers = data;
      },

      getTimers(data) {
        this.activeTimers = data.message.activeTimers;
        this.oldTimers = data.message.oldTimers;
        if (data.start) {
          info(`Created new timer "${data.description}" [${data.timerId}]`);
        }
        if (data.stop) {
          info(`Stopped the timer [${data.timerId}]`);
        }
      },

      createTimer() {
        const description = this.desc;
        this.desc = "";

        const fullMessage = JSON.stringify({
          type: "create_timer",
          message: description,
        });
        this.client.send(fullMessage);
      },

      stopTimer(timerId) {
        const fullMessage = JSON.stringify({
          type: "stop_timer",
          message: timerId,
        });
        this.client.send(fullMessage);
      },

      formatTime(ts) {
        return new Date(ts).toTimeString().split(" ")[0];
      },
      formatDuration(d) {
        d = Math.floor(d / 1000);
        const s = d % 60;
        d = Math.floor(d / 60);
        const m = d % 60;
        d = Math.floor(d / 60);
        const h = d % 24;
        const day = Math.floor(d / 24);

        return [day > 0 ? `${day}d:` : null, h > 0 ? h : null, m, s]
          .filter((x) => x !== null)
          .map((x) => (x < 10 ? "0" : "") + x)
          .join(":");
      },
    },
    created() {
      try {
        if (AUTH_TOKEN) {
          const wsProto = location.protocol === "https:" ? "wss" : "ws";
          this.client = new WebSocket(`${wsProto}://${location.host}`);
          console.log(AUTH_TOKEN);
          this.client.addEventListener("open", () => {
            setInterval(() => {
              if (this.client.readyState === 1) {
                this.client.send(JSON.stringify({ type: "active_timers" }));
              } else {
                alert("Сервер не отвечает");
              }
            }, 1000);
          });

          this.client.addEventListener("message", (message) => {
            let data;
            try {
              data = JSON.parse(message.data);
            } catch (err) {
              return console.error("Error:", err);
            }

            switch (data.type) {
              case "error":
                alert(data.message);
                console.log(data.message);
                break;
              case "all_timers":
                this.getTimers(data);
                break;
              case "active_timers":
                this.getActiveTimers(data.message);
                break;
            }
          });
        } else {
          alert("Авторизуйтесь снова");
        }
      } catch (error) {
        console.log("error:", error);
      }
    },
  });
})();
