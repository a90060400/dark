# Serenity 每日整理

把 [@aleabitoreddit](https://x.com/aleabitoreddit) 的公開貼文與回覆，依**台北日期**收成一份 Markdown 與一份 JSON。回覆會標成「回覆」，長文研究仍排在同一天裡。

程式只整理當天出現的 `$` 代號與原文節錄，方便回看。它不判斷多空，也不下單。作者可能持有文中提到的股票。請以原始貼文為準。

資料來自 [FxEmbed](https://docs.fxembed.com/api/twitter/operations/2profilehandlestatuses/) 的公開時間軸介面。這個介面不屬於 Serenity，也不保證一直可用。

## 執行

需要 Python 3.11 以上，只用標準函式庫。

```bash
python3 serenity_daily/digest.py
```

預設整理今天（台北），寫到 `serenity_daily/reports/`：

- `2026-10-29.md`
- `2026-10-29.json`

常用參數：

```bash
# 整理已經結束的昨天
python3 serenity_daily/digest.py --yesterday

# 指定日期，並往前共 3 天
python3 serenity_daily/digest.py --date 2026-10-29 --days 3
```

## 每天自動跑

在自己的機器上排程即可。下面是台北時間每天 08:10 整理昨天：

```cron
CRON_TZ=Asia/Taipei
10 8 * * * cd /你的專案路徑 && python3 serenity_daily/digest.py --yesterday
```

`reports/` 是產生出來的檔案，不進版控。
