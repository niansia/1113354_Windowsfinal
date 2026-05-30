/**
 * htmlTextureFactory.ts
 * 用於生成模擬 HTML 內容的 Canvas 貼圖
 */

export const createHtmlTextureCanvas = (label: string, width = 512, height = 512) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 側邊裝飾線 (模擬程式碼編輯器或技術文檔)
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, 40, height);

    // 標題區
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(label, 60, 60);

    // 副標題
    ctx.fillStyle = '#64748b';
    ctx.font = '18px sans-serif';
    ctx.fillText('EXPERIMENTAL RENDER NODE v4.2', 60, 95);

    // 內容線條 (模擬文字)
    ctx.fillStyle = '#e2e8f0';
    for (let i = 0; i < 6; i++) {
        ctx.fillRect(60, 140 + i * 25, width - 120, 12);
    }
    ctx.fillRect(60, 140 + 6 * 25, width * 0.6, 12);

    // 模擬圖片佔位符
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(60, 320, 120, 120);
    
    // 綠色圓形按鈕
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(width - 80, height - 80, 40, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ACTIVE', width - 80, height - 76);

    // 藍色邊框
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, width - 8, height - 8);

    return canvas;
};
