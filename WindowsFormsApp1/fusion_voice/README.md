# Fusion 語音服務

Fusion OS 的本機語音辨識、喚醒詞與 Gemma 4 理解服務。

## 系統整合

- Fusion OS 啟動時會在背景自動執行 `bootstrap_voice.py`，不需要手動開啟視窗。
- WebView2 會持久允許 `https://fusion.local` 使用麥克風。
- 前端會持續探測服務，首次安裝或模型下載完成後會自動接手。
- 預設語言為繁體中文，辨識語言會跟隨 Fusion OS 的語言設定。

## 語音管線

1. 瀏覽器端先啟用回音消除、降噪與自動增益。
2. WebRTC VAD 只保留人聲並以尾端靜音切分句子。
3. Faster-Whisper `small` multilingual 負責主要辨識。
4. Faster-Whisper 無法載入時，自動改用 Vosk 離線辨識。
5. 支援「嗨 Fusion」、「Hey Fusion」、「OK Fusion」與同句命令。

本機端點：

- `ws://127.0.0.1:8771/stt?lang=zh-TW`
- `http://127.0.0.1:8770/health`
- `http://127.0.0.1:8770/understand`

## Gemma 4 12B

主要模型為 instruction-tuned `google/gemma-4-12B-it`，以 4-bit NF4 載入並允許 CPU
卸載，適合 8 GB VRAM 的裝置。模型尚未就緒時，時間、天氣、應用程式與系統設定等命令
會由內建多語規則處理，不會阻塞語音功能。

`google/gemma-4-12B-it` 目前是公開的 Apache-2.0 模型，不需要 `HF_TOKEN`。
Hugging Face 登入僅用於提高下載速率限制，不是啟動模型的必要條件。

## 手動診斷

```bat
python bootstrap_voice.py
python bootstrap_voice.py --no-gemma
```

健康檢查會回報目前的 STT、VAD、Gemma 模型、載入狀態與錯誤原因。
