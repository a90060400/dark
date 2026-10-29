# Serenity 提及整理

把 [@aleabitoreddit](https://x.com/aleabitoreddit) 的公開貼文做成一頁網頁。打開後可以看到他提過哪些 `$` 代號、各提了幾次、出現在哪幾則貼文。

提及次數是代號在文字裡出現的次數。同一則寫兩次算兩次。貼文數是有出現該代號的則數。

這不是投資建議，也不判斷多空。作者可能持有文中提到的股票。請以原始貼文為準。

資料來自 [FxEmbed](https://docs.fxembed.com/api/twitter/operations/2profilehandlestatuses/) 的公開時間軸介面。這個介面不屬於 Serenity，也不保證一直可用。

## 執行

需要 Python 3.11 以上，只用標準函式庫。

```bash
python3 serenity_daily/digest.py
```

預設抓最近 14 個台北日，寫出：

- `serenity_daily/reports/index.html` — 用瀏覽器打開這個檔

頁面上可以切「全部」或單日，也可以搜尋代號。點一列會展開那些貼文與原文連結。

```bash
# 只看昨天
python3 serenity_daily/digest.py --yesterday

# 指定結束日，往前共 30 天
python3 serenity_daily/digest.py --date 2026-10-29 --days 30
```

## 每天自動更新

台北時間每天 08:10 重抓最近 14 天並覆寫網頁：

```cron
CRON_TZ=Asia/Taipei
10 8 * * * cd /你的專案路徑 && python3 serenity_daily/digest.py
```

`reports/` 是產生出來的檔案，不進版控。
