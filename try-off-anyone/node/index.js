import puppeteer from 'puppeteer';

async function searchGoogleLens(imageUrl) {
    if (!imageUrl) {
        console.error("❌ Error: No image URL provided.");
        process.exit(1);
    }

    try {
        // 啟動 Puppeteer
        const browser = await puppeteer.launch({
            headless: true,  // 可改成 false 以便調試
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.setExtraHTTPHeaders({
            "ngrok-skip-browser-warning": "true"
        });

        // await new Promise(resolve => setTimeout(resolve, 500000));
        // 進入 Google Lens 搜尋頁面

        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`;
        await page.goto(lensUrl, { waitUntil: 'networkidle2' });


        // 等待搜尋結果載入
        await page.waitForSelector('[role="listitem"]:nth-of-type(2)', { timeout: 5000 });
        await page.click('[role="listitem"]:nth-of-type(2)');

        // 擷取搜尋結果

        await page.waitForFunction(() => {
            const imgs = Array.from(document.querySelectorAll('div.gdOPf.q07dbf.uhHOwf.ez24Df img'));
            return imgs.length > 0 && imgs.every(img => img.src && !img.src.includes('data:image/gif'));
        }, { timeout: 5000 });
        
        const results = await page.evaluate(() =>
            Array.from(document.querySelectorAll('div.vEWxFf.RCxtQc.my5z3d')).map(el => ({
                retail: el.querySelector('div.R8BTeb.q8U8x.LJEGod.du278d.i0Rdmd')?.innerText.trim() || "無商家",
                link: el.querySelector('a.LBcIee').href,
                thumbnail: el.querySelector('div.gdOPf.q07dbf.uhHOwf.ez24Df img')?.src || "無縮圖"
            }))
        );

        await browser.close();

        // 輸出 JSON 給 Python 讀取
        console.log(JSON.stringify(results));
        process.exit(0);
    } catch (error) {
        console.error("❌ Puppeteer Error:", error);
        process.exit(1);
    }
}

// 從 CLI 讀取參數
const imageUrl = process.argv[2];  // 取得命令列參數
searchGoogleLens(imageUrl);
