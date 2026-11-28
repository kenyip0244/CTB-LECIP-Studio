// tts-bridge.js — CTB-LECIP-Studio 電腦 TTS 自動化與備註橋接模組

(function () {
  const AUTO_GEN_REMARK = "🤖 電腦 TTS 生成（小美／Lucy／小燕）";

  // 1. 小美（InterPhonic 6.0 粵語）語句前處理：口語轉書面語 + 地名多音字修正
  function toXiaomeiWritten(text = "") {
    const rules = [
      [/涌/g, "沖"], [/巿/g, "市"],
      [/我哋/g, "我們"],
      [/你哋/g, "你們"],
      [/佢哋/g, "他們"],
      [/嘅/g, "的"],
      [/喺/g, "在"],
      [/宜家/g, "現在"],
      [/落車/g, "下車"],
      [/同埋/g, "和"],
      [/撳鐘/g, "按鈴"],
      [/睇吓/g, "看看"],
      [/有咩/g, "有什麼"],
      [/拎齊/g, "帶齊"],
      [/唔知/g, "不知"],
      [/唔好/g, "不要"],
      [/唔係/g, "不是"],
      [/講晒俾你知/g, "全部告訴你"],
      [/俾/g, "給"],
      [/嚟/g, "來"],
      [/到咗/g, "到達"],
      [/喺呢個站/g, "在此站"],
      [/聽日/g, "明天"],
      [/係/g, "是"]
    ];
    let out = String(text);
    for (const [regex, rep] of rules) out = out.replace(regex, rep);
    return out;
  }

  function cleanStopEn(nameEn = "") {
    let s = String(nameEn).split(",")[0].split("/")[0].trim();
    s = s.replace(/\bLR\b/g, "Light Rail").replace(/\bKLN\b/gi, "Kowloon").replace(/\bHK\b/g, "Hong Kong");
    if (s.length > 4 && s === s.toUpperCase()) {
      s = s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
    }
    return s;
  }

  function safeStem(str = "") {
    return String(str)
      .replace(/[\\/:*?"<>|(),.']/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 40);
  }

  function joinCn(list = [], conj = "和") {
    const arr = list.filter(Boolean);
    if (arr.length <= 1) return arr[0] || "";
    return arr.slice(0, -1).join("、") + conj + arr[arr.length - 1];
  }

  function joinEn(list = []) {
    const arr = list.filter(Boolean);
    if (arr.length <= 1) return arr[0] || "";
    return arr.slice(0, -1).join(", ") + " and " + arr[arr.length - 1];
  }

  // 2. 按路線＋起點生成三語歡迎詞（口岸線 / 機場快線 LECIP & Telargo / 觀光城巴 / 一般線）
  function buildWelcomeScripts(item) {
    const route = String(item.route || "").toUpperCase();
    const origTc = item.orig_tc || "";
    const destTc = item.dest_tc || "";
    const origEn = item.orig_en || "";
    const destEn = item.dest_en || "";
    const areaTc = item.area_tc || "";
    const areaEn = item.area_en || "";
    const viaTc = item.via_tc || [];
    const viaEn = item.via_en || [];
    const viaTcStr = joinCn(viaTc, "和");
    const viaEnStr = joinEn(viaEn);

    const isFromAirport = /機場|Airport/i.test(origTc + origEn);
    const isToAirport = /機場|Airport|港珠澳大橋/i.test(destTc + destEn);
    const isFromHYW = /香園圍/i.test(origTc);
    const isFromSZB = /深圳灣|皇崗/i.test(origTc);
    const isFromPeak = /山頂|The Peak/i.test(origTc + origEn);

    let yue = "", cmn = "", en = "";

    if (route === "H1" || route === "H2") {
      const openTopYue = route === "H2" ? "開篷巴士" : "";
      const openTopCmn = route === "H2" ? "敞篷巴士" : "";
      yue = `你好啊！歡迎大家乘搭觀光城巴${openTopYue}${route}，由${origTc}出發往${destTc}。旅程中，你可以隨時在任何一個景點按鈴下車。記得下載我們的應用程式，看看景點附近有什麼推介行程和開篷巴士的到達時間！`;
      cmn = `你好呀！欢迎大家乘坐观光城巴${openTopCmn}${route}，从${origTc}出发前往${destTc}。旅途中，你可以随时在任何一个景点按铃下车。记得下载我们的App，看看景点附近的行程推介和敞篷巴士的到站时间。`;
      en = `Hello, or as we say in Hong Kong, Lei Ho Ar! Welcome aboard the HK City Sightseeing bus ${route}, departing from ${origEn} to ${destEn}. During your journey, feel free to ring the bell and hop off at any indicated bus stop to explore the sights and sounds of our city. Of course, don't forget to download our app to check out recommended attractions nearby and the bus routing and schedules.`;
    } else if (route === "H1S") {
      yue = `你好啊！好開心你找我同你一起搭觀光城巴！不知你來過幾多次香港呢？無論你是第一次還是來過很多次，我都會將香港的一切全部告訴你！`;
      cmn = `你好呀！很开心能和你一起乘坐观光城巴！不知道你来过香港几次了吗？无论你是第一次来，还是来过了很多次，我都会把香港的一切讲给你听。`;
      en = `Hello, or as we say in Hong Kong, Lei Ho Ar! We are excited to have you on the official HK City Sightseeing bus. Have you been to Hong Kong before? Whether it's your first time here, or you're a frequent visitor, I'm here to help and share everything about this vibrant city with you.`;
    } else if (route === "H2K") {
      yue = `晚安！歡迎大家乘搭觀光城巴夜遊路線H2K，由中環經九龍返回香港島。旅程中，你可以隨時在任何一個景點按鈴下車。記得下載我們的應用程式，看看景點附近有什麼推介行程和開篷巴士的到達時間！`;
      cmn = `大家晚上好！欢迎大家乘坐观光城巴夜游路线H2K，从中环途经九龙返回香港岛。旅途中，你可以随时在任何一个景点按铃下车。记得下载我们的App，看看景点附近的行程推介和敞篷巴士的到站时间。`;
      en = `Good evening, or as we say in Hong Kong, Maan On. Welcome aboard the HK City Sightseeing bus night tour H2K, travelling from the Central district to Kowloon and back to Hong Kong Island. During your journey, feel free to ring the bell and hop off at any indicated bus stop to explore the sights and sounds of our city. Of course, don't forget to download our app to check out recommended attractions nearby and the bus routing and schedules.`;
    } else if (route === "H3" || route === "H4") {
      const viaTailTc = viaTc.length ? `、${viaTcStr}` : "";
      const viaTailEn = viaEn.length ? `, ${viaEnStr}` : "";
      yue = `歡迎乘搭觀光城巴「海岸之旅」${route}號線，經海洋公園${viaTailTc}前往${destTc}，祝旅途愉快。`;
      cmn = `欢迎乘搭观光城巴“海岸之旅”第${route}路，经海洋公园${viaTailTc}前往${destTc}，祝旅途愉快。`;
      en = `Welcome aboard Hong Kong City Sightseeing bus Coastliner route ${route} towards ${destEn}, via Ocean Park${viaTailEn}. Thank you and enjoy the journey.`;
    } else if (route === "H20") {
      yue = `你好啊！歡迎大家乘搭觀光城巴H20，由啟德郵輪碼頭前往尖沙咀。旅程中，你可以在開篷巴士欣賞沿途景色。記得下載我們的觀光城巴手機應用程式，看看景點附近有什麼推介行程和開篷巴士的到達時間！`;
      cmn = `你好呀！欢迎大家搭乘观光城巴H20，从启德邮轮码头前往尖沙咀。在旅程中，你可以在敞篷巴士上欣赏街头风景。记得下载我们的观光城巴手机应用程式，看看景点附近的推介行程和开篷巴士的到站时间喔！`;
      en = `Lee Ho Ar! Welcome aboard the HK City Sightseeing bus route H20, departing from the Kai Tak Cruise Terminal to Tsim Sha Tsui, The Peninsula. During your journey, feel free to ring the bell and hop off at any indicated bus stop to explore the sights and sounds of our city. Of course, don't forget to download our Citybus Sightseeing app to check out recommended attractions nearby and the bus routing and schedules.`;
    } else if (route === "15") {
      if (isFromPeak) {
        yue = `歡迎乘搭山頂探索號，我們即將帶領你回到市區。記得不要錯過你身邊的景色。下車時，亦都要看看主要下車站提示呀！`;
        cmn = `欢迎乘坐山顶探索号，我们即将带领你回到市区。别错过你身边的景色。下车时，也别忘留意主要下车站的提示。`;
        en = `Welcome onboard the Peak Explorer. We will take you back to the city. Don't miss the en route spectacular views, as well as the reminder for major bus stops.`;
      } else {
        yue = `歡迎乘搭山頂探索號，我們即將帶領你遊遍中環、金鐘、灣仔、山頂。帶你飽覽市區景色，體驗山頂魅力。`;
        cmn = `欢迎乘坐山顶探索号，我们即将带领你游遍中环、金钟、湾仔、山顶。带你饱览市区景色，体验山顶魅力。`;
        en = `Welcome onboard the Peak Explorer. We will take you through Central, Admiralty, Wan Chai and The Peak. Don't forget to enjoy the en route city views, and feel the vitality of The Peak.`;
      }
    } else if (/^(A|NA)\d+/.test(route)) {
      const isLecipAirport = ["A17", "A23", "A25"].includes(route);
      const hasHZMB = ["A11", "A21", "A22", "A29"].includes(route) || route.startsWith("NA");

      if (isFromAirport) {
        const areaPrefixTc = route.startsWith("A29") ? "" : areaTc;
        const areaSuffixEn = (!route.startsWith("A29") && areaEn) ? ` in ${areaEn}` : "";
        const viaClauseTc = viaTc.length ? `本班車將途經${viaTcStr}。` : "";
        const viaClauseEn = viaEn.length ? `, via ${viaEnStr}` : "";

        if (isLecipAirport) {
          yue = `歡迎蒞臨香港，多謝選搭城巴機場快線${route}號線，前往${areaPrefixTc}${destTc}。${viaClauseTc}現在離市區第一個巴士站的車程，約為三十分鐘。請安坐欣賞沿途景色，稍後我們會播放下車站的位置資料。請小心看管您的財物，祝旅途愉快。`;
          cmn = `欢迎莅临香港，谢谢选乘城巴机场快线第${route}路，前往${areaPrefixTc}${destTc}。${viaClauseTc}现在离市区第一个车站的车程，约为三十分钟。请安坐欣赏沿途景色，稍后会播放下车站的位置资料。请小心看管您的财物，祝您旅途愉快。`;
          en = `Welcome to Hong Kong. Thank you for travelling with Cityflyer route ${route}, bound for ${destEn}${areaSuffixEn}${viaClauseEn}. We are about 30 minutes from the first stop in the City. Please sit back, relax and enjoy the scenery. We will broadcast the location information of the bus stop as we proceed. Please make sure your personal belongings are secured. We wish you a pleasant journey.`;
        } else {
          yue = `歡迎蒞臨香港，多謝選搭城巴機場快線${route}號線，前往${areaPrefixTc}${destTc}。${viaClauseTc}現在離市區第一個巴士站的車程，約為三十分鐘。請安坐欣賞沿途景色，稍後我們會播放下車站的位置資料。車廂內已設有視像錄影監察系統，請小心看管您的財物，並謹記於下車時攜帶您的行李，祝旅途愉快。座位上若已安裝安全帶，請即扣好，以保安全。`;
          cmn = `欢迎莅临香港，谢谢选乘城巴机场快线第${route}路，前往${areaPrefixTc}${destTc}。${viaClauseTc}现在离市区第一个车站的车程，约为三十分钟。请安坐欣赏沿途景色，稍后会播放下车站的位置资料。车厢内已设有视像录像监察系统，请小心看管您的财物，并谨记于下车时携带您的行李，祝您旅途愉快。座位上如果已经安装安全带，请即扣上，以保安全。`;
          en = `Welcome to Hong Kong. Thank you for travelling with Cityflyer route ${route}, bound for ${destEn}${areaSuffixEn}${viaClauseEn}. We are about 30 minutes from the first stop in the City. Please sit back, relax and enjoy the scenery. We will broadcast the location information of the bus stop as we proceed. Video recording is in operation inside the bus compartment. Please make sure your personal belongings are secured and take all luggage with you when alighting. We wish you a pleasant journey. For your own safety, please buckle up if a seat belt is provided.`;
        }
      } else if (isToAirport) {
        if (isLecipAirport) {
          yue = `歡迎乘搭城巴機場快線，前往港珠澳大橋香港口岸和香港國際機場。請小心看管您的財物，祝旅途愉快。`;
          cmn = `欢迎乘坐城巴机场快线，前往港珠澳大桥香港口岸和香港国际机场。请小心看管你的财物，祝您旅途愉快。`;
          en = `Welcome aboard Cityflyer. We are now proceeding to the Hong Kong-Zhuhai-Macao Bridge Hong Kong Port and the Hong Kong International Airport. Please make sure your personal belongings are secured. We wish you a pleasant journey.`;
        } else {
          const hzmbTc = hasHZMB ? "和港珠澳大橋香港口岸" : "";
          const hzmbEn = hasHZMB ? " and Hong Kong-Zhuhai-Macao Bridge Hong Kong Port" : "";
          yue = `歡迎乘搭城巴機場快線，前往香港國際機場${hzmbTc}。請小心看管您的財物，祝旅途愉快。`;
          cmn = `欢迎乘坐城巴机场快线，前往香港国际机场${hzmbTc}。请小心看管你的财物，祝您旅途愉快。`;
          en = `Welcome aboard Cityflyer. We are now proceeding to the Hong Kong International Airport${hzmbEn}. Please make sure your personal belongings are secured. We wish you a pleasant journey.`;
        }
      }
    } else if (/^B\d+/.test(route)) {
      if ((route === "B7" || route === "B8") && isFromHYW) {
        const viaPartTc = viaTc.length ? `經${viaTc.join("、")}，` : "";
        const viaPartEn = viaEn.length ? `, via ${viaEnStr}` : "";
        yue = `歡迎乘搭城巴${route}號線，${viaPartTc}前往${destTc}，請小心看管您的財物，祝您旅途愉快。`;
        cmn = `欢迎乘搭城巴第${route}路，${viaPartTc}前往${destTc}，请小心看管您的财物，祝您旅途愉快。`;
        en = `Welcome aboard Citybus route ${route} towards ${destEn}${viaPartEn}. Please make sure your personal belongings are secured. We wish you a pleasant journey.`;
      } else if ((route === "B3" || route === "B3A") && isFromSZB) {
        const viaClauseTc = viaTc.length ? `本班車將途經${viaTcStr}。` : "";
        const viaPartEn = viaEn.length ? `, via ${viaEnStr}` : "";
        yue = `歡迎乘搭城巴${route}號線，前往${destTc}。${viaClauseTc}請安坐欣賞沿途景色，我們會在途中播放下車站的位置資料。請小心看管您的財物，祝您旅途愉快。`;
        cmn = `欢迎乘搭城巴第${route}路，前往${destTc}。${viaClauseTc}请安坐欣赏沿途景色，我们会在途中播放下车站的位置资料。请小心看管您的财物，祝您旅途愉快。`;
        en = `Welcome aboard Citybus route ${route} towards ${destEn}${viaPartEn}. Please sit back, relax and enjoy the scenery. We will broadcast the location information of the bus stop as we proceed. Please make sure your personal belongings are secured. We wish you a pleasant journey.`;
      } else if (["B3X", "B3M", "B13", "B14", "B15"].includes(route) && isFromSZB) {
        const viaPartTc = viaTc.length ? `經${viaTc.join("、")}，` : "";
        const viaPartEn = viaEn.length ? `, via ${viaEnStr}` : "";
        yue = `歡迎乘搭城巴${route}號線，${viaPartTc}前往${destTc}。請安坐欣賞沿途景色，我們會在途中播放下車站的位置資料。請小心看管您的財物，祝您旅途愉快。`;
        cmn = `欢迎乘搭城巴第${route}路，${viaPartTc}前往${destTc}。请安坐欣赏沿途景色，我们会在途中播放下车站的位置资料。请小心看管您的财物，祝您旅途愉快。`;
        en = `Welcome aboard Citybus route ${route} towards ${destEn}${viaPartEn}. Please sit back, relax and enjoy the scenery. We will broadcast the location information of the bus stop as we proceed. Please make sure your personal belongings are secured. We wish you a pleasant journey.`;
      } else if (["B13", "B14", "B15"].includes(route)) {
        yue = `歡迎乘搭城巴${route}號線，前往${destTc}。請安坐欣賞沿途景色，我們會在途中播放下車站的位置資料。請小心看管您的財物，祝您旅途愉快。`;
        cmn = `欢迎乘搭城巴第${route}路，前往${destTc}。请安坐欣赏沿途景色，我们会在途中播放下车站的位置资料。请小心看管您的财物，祝您旅途愉快。`;
        en = `Welcome aboard Citybus route ${route} towards ${destEn}. Please sit back, relax and enjoy the scenery. We will broadcast the location information of the bus stop as we proceed. Please make sure your personal belongings are secured. We wish you a pleasant journey.`;
      } else {
        yue = `歡迎乘搭城巴${route}號線，前往${destTc}，請小心看管您的財物，祝您旅途愉快。`;
        cmn = `欢迎乘搭城巴第${route}路，前往${destTc}，请小心看管您的财物，祝您旅途愉快。`;
        en = `Welcome aboard Citybus route ${route} towards ${destEn}. Please make sure your personal belongings are secured. We wish you a pleasant journey.`;
      }
    }

    if (!yue) {
      const viaPartTc = viaTc.length ? `經${viaTc.join("、")}` : "";
      const viaPartEn = viaEn.length ? `, via ${viaEnStr}` : "";
      yue = `歡迎乘搭城巴${route}號線，${viaPartTc}前往${destTc}，祝旅途愉快。`;
      cmn = `欢迎乘坐城巴第${route}路，${viaPartTc}前往${destTc}，祝您旅途愉快。`;
      en = `Welcome aboard Citybus route ${route} towards ${destEn}${viaPartEn}. Thank you and enjoy the journey.`;
    }

    return {
      yue_tts: toXiaomeiWritten(yue),
      cmn_tts: cmn,
      en_tts: en
    };
  }

  // 3. 匯出「缺失車站（含中英文）＋ 缺失歡迎詞」工作包 JSON
  function exportMissingTTSJob({ missingStops = [], missingWelcomes = [], routeFilter = "" }) {
    const rf = routeFilter.trim().toUpperCase();

    const stopsPayload = missingStops
      .filter(s => !rf || (s.routes || []).some(r => String(r).toUpperCase() === rf))
      .map(s => {
        const shortEn = cleanStopEn(s.name_en || s.nameEn || "");
        const rawTc = (s.name_tc || s.nameTc || s.name || "").trim();
        const stem = `AUTOGEN_STOP_${s.id}_${safeStem(shortEn || "STOP")}`;
        return {
          type: "stop",
          stopId: String(s.id),
          routes: s.routes || [],
          name_tc: rawTc,
          name_en: shortEn,
          yue_tts: `${toXiaomeiWritten(rawTc)}。`,
          cmn_tts: `${rawTc}。`,
          en_tts: `Next stop: ${shortEn}.`,
          outputStem: stem
        };
      });

    const welcomesPayload = missingWelcomes
      .filter(w => !rf || String(w.route || "").toUpperCase() === rf)
      .map(w => {
        const scripts = buildWelcomeScripts(w);
        const key = safeStem(w.welcomeKey || `${w.route}_${w.bound || "O"}_${w.serviceType || "1"}`);
        return {
          type: "welcome",
          welcomeKey: String(w.welcomeKey || key),
          route: String(w.route || ""),
          orig_tc: w.orig_tc || "",
          dest_tc: w.dest_tc || "",
          ...scripts,
          outputStem: `AUTOGEN_WELCOME_${key}`
        };
      });

    const job = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      routeFilter: rf || "ALL",
      counts: { stops: stopsPayload.length, welcomes: welcomesPayload.length },
      stops: stopsPayload,
      welcomes: welcomesPayload
    };

    const blob = new Blob([JSON.stringify(job, null, 2)], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ctb_missing_tts_${rf || "ALL"}.json`;
    a.click();
    return job.counts;
  }

  // 4. 上傳音檔時自動識別電腦生成器產物並生成「備註」中繼資料
  function parseAutoGenFile(fileName = "") {
    const now = new Date().toISOString();
    const stopMatch = fileName.match(/^AUTOGEN_STOP_(\d+)(?:_.*)?\.(mp3|wav|ogg|m4a)$/i);
    if (stopMatch) {
      return {
        kind: "stop",
        stopId: stopMatch[1],
        isAutoGen: true,
        confirmed: true,
        autoConfirmed: true,
        source: "pc_tts_generator",
        remark: AUTO_GEN_REMARK,
        note: AUTO_GEN_REMARK,
        generatedAt: now
      };
    }
    const welcomeMatch = fileName.match(/^AUTOGEN_WELCOME_([A-Za-z0-9_-]+)\.(mp3|wav|ogg|m4a)$/i);
    if (welcomeMatch) {
      return {
        kind: "welcome",
        welcomeKey: welcomeMatch[1],
        isAutoGen: true,
        confirmed: true,
        autoConfirmed: true,
        source: "pc_tts_generator",
        remark: AUTO_GEN_REMARK,
        note: AUTO_GEN_REMARK,
        generatedAt: now
      };
    }
    return null;
  }

  // 5. 產生 HTML 備註標籤（可直接插入「已處理音檔」或車站項目列表）
  function renderAutoGenBadge(item = {}) {
    if (!item || (!item.isAutoGen && item.source !== "pc_tts_generator" && !String(item.fileName || "").startsWith("AUTOGEN_"))) {
      return "";
    }
    const label = item.remark || item.note || AUTO_GEN_REMARK;
    return `<span class="tts-autogen-badge" title="${label}" style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;margin-left:6px;border-radius:999px;font-size:11px;font-weight:600;background:#1e3a8a;color:#93c5fd;border:1px solid #3b82f6;">TTS 生成</span>`;
  }

  window.CTB_TTS_BRIDGE = {
    AUTO_GEN_REMARK,
    toXiaomeiWritten,
    buildWelcomeScripts,
    exportMissingTTSJob,
    parseAutoGenFile,
    renderAutoGenBadge
  };
})();
