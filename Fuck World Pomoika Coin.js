const io = require('socket.io-client');
const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');

const should_transfer = 222856843;

const should_buy = false;
// true - делает покупки   false - не делает покупки

const should_click = false;
// true - будет кликать   false - не будет кликать

const click_delay = [50, 100];
// какая задержка будет между кликами, от минимума до максимума


const accounts = [
  {
    name: "Маргарита",
    ref: "https://coin.world-coin-game.ru/?vk_access_token_settings=&vk_app_id=7614516&vk_are_notifications_enabled=0&vk_is_app_user=1&vk_is_favorite=0&vk_language=ru&vk_platform=&vk_ref=other&vk_ts=1603554984&vk_user_id=589771678&sign=r22z_6YZorNz9PjScOhR6t8dKmqqC7ew8ZFFd5PHzfU",
    proxy: {
      host: '185.233.203.233',
      port: 9505
    }
  },
  {
    name: "Дефаня",
    ref: "https://coin.world-coin-game.ru/?vk_access_token_settings=&vk_app_id=7614516&vk_are_notifications_enabled=0&vk_is_app_user=0&vk_is_favorite=0&vk_language=ru&vk_platform=&vk_ref=other&vk_ts=1603555224&vk_user_id=613907003&sign=gUAV87f1Hji7dt0P1lSiYU57jAJjuhSNf54i91zDQqg",
    proxy: {
      host: '185.233.201.38',
      port: 9009
    }
  },
  {
    name: "Арсений",
    ref: "https://coin.world-coin-game.ru/?vk_access_token_settings=&vk_app_id=7614516&vk_are_notifications_enabled=0&vk_is_app_user=1&vk_is_favorite=0&vk_language=ru&vk_platform=&vk_ref=other&vk_ts=1603555346&vk_user_id=472441406&sign=bz6TvEy6zQGI7aaC9U3p6KHia-EmXsPmMx6edNlEX_8",
    proxy: {
      host: '185.233.200.45',
      port: 9185
    }
  },
  {
    name: "Дима",
    ref: "https://coin.world-coin-game.ru/?vk_access_token_settings=friends&vk_app_id=7614516&vk_are_notifications_enabled=0&vk_is_app_user=1&vk_is_favorite=0&vk_language=ru&vk_platform=&vk_ref=other&vk_ts=1603555664&vk_user_id=222856843&sign=HuAyMn1L__4f9VwZ0gBFuXjDkSmkFfs5S1rV7AHIDyA",
    proxy: {
      host: '185.233.203.56',
      port: 9205
    }
  }

]

const DELAY = ms => new Promise(_ => setTimeout(_, ms));
const getRndInteger = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const numberWithSpace = number => number.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, " ");

const secretToken = "npaP 2oA 6F:o5ma2w8*P4Aцxvk[ацpTы ф";


const improvementsList = [
  "macros",
  "script",
  "clicker",
  "hackers",
  "neural",
  "ai"
];





class Socket {
  forceStop = false
  currentImproIndex = 0;

  static accsBalance = {};

  static countCommonBalance = _ => {
    let totalSumm = 0;
    Object.keys(Socket.accsBalance).forEach(name => {
      totalSumm += Socket.accsBalance[name]
    })
    return numberWithSpace(totalSumm.toFixed(2))

  }



  constructor(name, ref, proxy) {
    this.proxy = proxy;
    this.name = name;
    this.ref = ref;

    this.id = Number(ref.split('&vk_user_id=')[1].split('&')[0]);
    this.openAndManageSocket()
  }



  setNewImprovement() {
    if (improvementsList[this.currentImproIndex + 1]) {
      this.currentImproIndex += 1;
    } else {
      this.currentImproIndex = 0
    }

  }

  sender(type) {
    this.socket.json.send({
      type,
      user: this.id,
      token: this.token
    })

  }

  makeTranfer(toId, sum) {
    console.log(this.name, 'Making transfer to', toId, "Amount:", sum);
    axios({
      method: 'post',
      url: "https://coin.world-coin-game.ru/server/capi.php",
      data: {
        query: "actions",
        data: {
          a: "transfer",
          to: toId,
          sum
        },
        secret: secretToken,
        uid: this.id,
        referer: this.ref
      }
    }).then(res => {
      if (res.data.status) {
        console.log(this.name, 'Successfull transfer');
      } else {
        console.log(this.name, 'Trans error', res.data);
      }
    })
  }



  buyImprovement() {
    console.log(this.name, 'Trying to buy', improvementsList[this.currentImproIndex]);
    axios({
      method: 'post',
      url: "https://coin.world-coin-game.ru/server/capi.php",
      data: {
        query: "actions",
        data: {
          a: "buyImprovement",
          id: improvementsList[this.currentImproIndex]
        },
        secret: secretToken,
        uid: this.id,
        referer: this.ref
      }
    }).then(res => {
      this.setNewImprovement()
      console.log(res.data);
      if (res.data.status) {
        this.sender("updateDB")
      }
    })
  }

  async sendDelayClick() {
    if (this.forceStop) return;

    await DELAY(getRndInteger(click_delay[0], click_delay[1]))
    if (this.forceStop) return;
    this.sender("click");
    return

  }


  async startClicking() {
    if (this.forceStop) return;

    console.log(this.name, 'Clicking');
    for (var i = 0; i < 150; i++) {
      if (this.forceStop) return;

      await this.sendDelayClick();
    }
    console.log(this.name, 'Pause Clicking');
    if (this.forceStop) return;

    await DELAY(getRndInteger(5e3, 8e3))
    if (this.forceStop) return;

    this.startClicking()

  }

  getUpdate() {
    this.sender('update')
  }

  openAndManageSocket() {

    this.socket = !this.proxy ? io('https://coin.world-coin-game.ru', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      extraHeaders: {
        Host: "coin.world-coin-game.ru",
        "User-Agent": `Mozilla/5.0 (Linux; Android 6.0.1; S${getRndInteger(1, 5000)} Build/MMB29K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/86.0.4240.99 Safari/537.36`,
        Origin: "https://coin.world-coin-game.ru"

      }
    }) : io('https://coin.world-coin-game.ru', {
      agent: new HttpsProxyAgent(this.proxy),
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      extraHeaders: {
        Host: "coin.world-coin-game.ru",
        "User-Agent": `Mozilla/5.0 (Linux; Android 6.0.1; ${getRndInteger(1, 5000)} Build/MMB29K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/86.0.4240.99 Safari/537.36`,
        Origin: "https://coin.world-coin-game.ru"

      }
    });

    this.socket.on('connect', async () => {
      console.log(this.name, 'connected');
      await DELAY(5e3)
      this.forceStop = false;

      this.socket.json.send({
        type: 'init',
        user: this.id,
        referer: this.ref
      });
    })


    this.socket.on('message', async (msg) => {
      if (msg.type == 'init') {
        this.token = msg.token

        await DELAY(5e3)

        console.log('Starting');
        if (should_click) {

          this.startClicking()
        }

        this.getUpdateInterval = setInterval(() => {
          if (this.forceStop) return;

          this.getUpdate()

        }, 2e3)

        if (should_transfer) {
          setInterval(() => {
            this.makeTranfer(should_transfer, Socket.accsBalance[this.name] - 1)
          }, 3600000);
        }

        if (should_buy) {
          this.buyImproInterval = setInterval(() => {
            if (this.forceStop) return;

            this.buyImprovement()


          }, 20e3)
        }


      } else if (msg.type == 'update') {
        Socket.accsBalance[this.name] = msg.coins;
        console.log(this.name, msg.coins.toFixed(2), '    ', 'Total:', Socket.countCommonBalance());
      } else {
        console.log(this.name, msg);

      }
    });


    this.socket.on('connect_error', (e) => {
      console.log('Conn error', e);
    });

    this.socket.on('disconnect', () => {
      console.log(this.name, 'Disconnected');
      this.forceStop = true;
      if (should_buy) {

        clearInterval(this.buyImproInterval)
      }
      clearInterval(this.getUpdateInterval)


      this.socket.disconnect()
      this.socket = null;
      this.openAndManageSocket()
    });

  }


}
(async () => {
  console.log("should_transfer", should_transfer);
  console.log("should_buy", should_buy);
  console.log("should_click", should_click);
  console.log("click_delay", [50, 100]);

  await DELAY(3e3)

  for (const acc of accounts) {
    new Socket(acc.name, acc.ref, acc.proxy ? acc.proxy : false)
  }

})();

