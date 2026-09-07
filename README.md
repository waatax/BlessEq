# BlessEq · 幸福門訓裝備系統

> **「因為你要將所看見的，所聽見的，對着萬人為他作見證。」—— 使徒行傳二十二章 15 節**

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-gold?style=for-the-badge&logo=github)](http://waatax.github.io/BlessEq)
[![Biblia Design](https://img.shields.io/badge/Design%20System-Biblia%20Sacred-8C2234?style=for-the-badge)](http://waatax.github.io/BlessEq)
[![Modules](https://img.shields.io/badge/Equipped%20Lessons-17%20Courses-3E6348?style=for-the-badge)](http://waatax.github.io/BlessEq)

---

## 專案簡介 (Overview)

**BlessEq** 是一套專為基督徒幸福小組與門徒學校（門徒學校下）打造的頂級數位化門訓裝備學習系統。平台以 **Biblia（聖言典雅手抄本風格）** 為核心美學，完整收錄全套 **17 門裝備課程**、**443 張高畫質講義投影片**，並深度結合 **17 份門下講義全文述說教學**。

線上體驗網址：👉 **[http://waatax.github.io/BlessEq](http://waatax.github.io/BlessEq)**

---

## 課程收錄全覽 (Curriculum Matrix)

### 一、 門訓總攬 (Overview)
- **第 00 課：門下裝備總攬**（幸福門訓系統概覽與裝備心態）

### 二、 門徒必修課程 (Core Disciple Lessons 01 - 12)
- **第 01 課：為主作榮耀的見證**（生命故事與福音大能）
- **第 02 課：誰是我的主人**（生命主權的轉移與交託）
- **第 03 課：幸福小組概論**（扁平化宣教策略與同工團隊）
- **第 04 課：幸福劇場**（精心營造溫暖與愛的氛圍）
- **第 05 課：聖靈與福音**（得著能力宣揚天國好消息）
- **第 06 課：建立禱告生活**（隨時多方祈求與屬靈爭戰）
- **第 07 課：愛慕上帝的話**（神聖默示、屬靈糧食與行道）
- **第 08 課：美好的小組生活**（肢體相顧、凡物公用與同心合意）
- **第 09 課：從順服到蒙福**（以基督的心為心，順服得勝）
- **第 10 課：門徒的價值觀**（永恆視野與天國產業重估）
- **第 11 課：性格成熟的門徒**（聖靈果子與生命品格淬鍊）
- **第 12 課：門徒的家庭觀**（當信主耶穌，一家都必得救）

### 三、 幸福小組實作秘笈 (Practical Toolkits 01 - 04)
- **秘笈 01：如何在幸福小組中作見證**（3-5分鐘動人見證黃金三段式結構）
- **秘笈 02：如何邀約 BEST**（鎖定對象、突破心防與熱情邀約心法）
- **秘笈 03：如何引導 BEST 受洗（上）**（釐清受洗意義與跨越信仰門檻）
- **秘笈 04：如何引導 BEST 受洗（下）**（諸般智慧、破除阻礙與決志關鍵）

---

## 核心功能特色 (Key Features)

1. **Biblia 聖言經典美學**：
   - 古典羊皮紙暖白底色（#FAF7F2）護眼閱讀。
   - 聖殿熔金（Ark Gold #C59325）重點導航。
   - 經文緋紅（Biblical Crimson #8C2234）金句卡片。
   - 一鍵切換「黑曜石靜夜研經模式 (Obsidian Dark)」。
2. **雙軌同步研讀工作台**：
   - 左欄：443 張高畫質投影片展示、縮圖導覽列、投影片要點與講員筆記。
   - 右欄：門下講義全文述說教學、經文速查卡、小組反思與實踐作業。
3. **講員投影展示模式 (Presenter Mode)**：
   - 按鍵 `F` 即可進入全螢幕 Apple Keynote / ProPresenter 等級投影展示。
   - 支援鍵盤左右箭頭、空白鍵換頁與即時講義提示。
4. **講義互動挖空填空測驗 (Interactive Fill-in-the-Blanks)**：
   - 點擊「填空測驗」一鍵遮蔽關鍵填空字，點擊個別空格即可微動態揭曉答案。
5. **講義語音述說導讀 (Web Speech Narration)**：
   - 整合瀏覽器語音合成 API，隨選 1.0x / 1.2x / 1.5x 語速隨身聽講義。
6. **智慧全文檢索系統 (Instant Search - Ctrl+K)**：
   - 快速索引 17 門課程、443 張投影片文字與講義全文，搜尋關鍵字即時高亮並跳轉。
7. **實作秘笈工具箱**：
   - 內建「見證三段論生成器」與「BEST 邀約及受洗引導檢核清單」。

---

## 專案結構 (Directory Structure)

```
BlessEq/
├── index.html              # 主入口頁面（語意化 HTML5、Biblia 配色與無障礙設計）
├── css/
│   └── biblia.css          # Biblia 聖言美學樣式庫（CSS 變數、響應式佈局）
├── js/
│   ├── app.js              # 核心控制器（路由、投影、填空、音訊、搜尋）
│   └── data.js             # 17 門課程完整資料集（含 443 張簡報與全文講義）
├── data/
│   └── curriculum.json     # 標準化 JSON 知識庫
├── assets/
│   └── slides/             # 443 張 1440x810 高壓縮 WebP 投影片圖資
│       ├── 00/ ... 12/     # 門訓總攬與門徒必修 01-12
│       └── ar01/ ... ar04/ # 實作秘笈 01-04
└── README.md               # 專案說明文檔
```

---

## 授權與宣告 (Dedication)

願本平台成為眾教會、小組長與弟兄姊妹興起門徒、傳揚天國福音的得力裝備工具！
**「但聖靈降臨在你們身上，你們就必得著能力，並要在耶路撒冷、猶太全地，和撒馬利亞，直到地極，作我的見證。」**
