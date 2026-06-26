const express = require('express');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const { HfInference } = require('@huggingface/inference'); // 🌟 허깅페이스 부품 등장!

const app = express();
const PORT = process.env.PORT || 3000;

// 🚨 허깅페이스에서 발급받은 무료 토큰(hf_...)을 반드시 아래에 넣어주세요!
const HF_TOKEN = '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';
const hf = new HfInference(HF_TOKEN);

const upload = multer({ storage: multer.memoryStorage() });
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/pixelate', upload.single('photo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "사진이 없습니다!" });

    try {
        console.log("📸 원본 사진 업로드 됨! 허깅페이스로 전송 준비...");

        // 🔥 1. 무료 서버가 과부하 걸리지 않게 사진 크기를 512x512로 줄여줍니다.
        const resizedImageBuffer = await sharp(req.file.buffer)
            .resize(512, 512, { fit: 'cover' })
            .jpeg() // 용량을 더 줄이기 위해 jpeg 사용
            .toBuffer();

        // 2. 허깅페이스가 읽을 수 있는 Blob 형태로 변환 (Node 24버전 기본 지원!)
        const imageBlob = new Blob([resizedImageBuffer], { type: 'image/jpeg' });

        console.log("⏳ 허깅페이스 AI가 도트를 찍고 있습니다... (무료 서버라 10~30초 소요될 수 있음!)");
        
        // 🔥 3. 사진을 수정해주는 유명한 오픈소스 모델(InstructPix2Pix)에게 지시!
        const responseBlob = await hf.imageToImage({
            model: 'runwayml/stable-diffusion-v1-5', 
            inputs: imageBlob,
            parameters: {
                prompt: "Convert this image into a cute 8-bit retro pixel art, masterpiece, high quality.",
            }
        });

        // 4. 결과물(Blob)을 다시 웹 화면에 띄우기 위해 Base64로 변환
        const arrayBuffer = await responseBlob.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');
        const finalImageUrl = `data:image/jpeg;base64,${base64Image}`;

        console.log("✨ 100% 무료 픽셀 아트 띠부실 완성!");

        res.json({
            success: true,
            pixelImageUrl: finalImageUrl
        });

    } catch (error) {
        console.error("❌ 허깅페이스 에러:", error.message);
        res.status(500).json({ error: "무료 AI 서버가 너무 바쁘거나 잠들어 있습니다 ㅠㅠ 잠시 후 다시 시도해 주세요!" });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 완전 무료 허깅페이스 서버 가동 중! (http://localhost:${PORT})`);
});
