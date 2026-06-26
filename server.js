const express = require('express');
const path = require('path');
const multer = require('multer');
const { OpenAI } = require('openai'); // 🌟 OpenAI 출동!

const app = express();
const PORT = process.env.PORT || 3000;

// 🚨 발급받은 OpenAI API 키를 여기에 넣어주세요!
const OPENAI_API_KEY = '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';

// OpenAI 연결 설정
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/pixelate', upload.single('photo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "사진이 없습니다!" });

    try {
        console.log("📸 사진 업로드 완료! GPT-4o 분석 시작...");

        // 1. 이미지를 Base64 문자열로 변환 (GPT에게 보여주기 위함)
        const base64Image = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;

        // 2. [1단계 콤보] GPT-4o 비전에게 사진 묘사 시키기
        const visionResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Describe the core features of the person/object in this image (hair, clothes, expression, colors) in a short English sentence." },
                        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                    ]
                }
            ],
            max_tokens: 100
        });

        const imageDescription = visionResponse.choices[0].message.content;
        console.log("🗣️ GPT의 사진 묘사:", imageDescription);

        // 3. [2단계 콤보] 묘사된 글을 바탕으로 DALL-E 3에게 픽셀 아트 지시!
        console.log("🎨 DALL-E 3로 픽셀 아트 생성 중 (약 10초 소요)...");
        const dalleResponse = await openai.images.generate({
            model: "dall-e-3",
            prompt: `A cute 8-bit pixel art character, retro game style, masterpiece, high quality, solid white background. The character has the following features: ${imageDescription}`,
            n: 1,
            size: "1024x1024",
        });

        const finalImageUrl = dalleResponse.data[0].url;
        console.log("✨ 픽셀 아트 띠부실 완성!");

        res.json({
            success: true,
            pixelImageUrl: finalImageUrl
        });

    } catch (error) {
        console.error("❌ OpenAI 서버 에러:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "OpenAI 변환 중 에러가 발생했습니다!" });
    }
});

// 홈페이지 띄우기
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 OpenAI 연동 서버 가동 중! (http://localhost:${PORT})`);
});
