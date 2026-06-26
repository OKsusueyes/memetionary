const express = require('express');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp'); 

const app = express();
const PORT = process.env.PORT || 3000;

// 🚨 주의: 이전 채팅에 올리셨던 키는 노출되었으니, 꼭 '새로 발급받은 API 키'를 넣어주세요!
const STABILITY_API_KEY = 'sk-DK7E2Dx931AJkpUBFIehIgvep2sofBjukpFyZ2Pam8UizKgc';

const upload = multer({ storage: multer.memoryStorage() });
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/pixelate', upload.single('photo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "사진이 없습니다!" });

    try {
        console.log("📸 원본 사진 업로드 됨! 크기:", req.file.size, "bytes");

        // 🔥 [수정됨] 최신 SDXL 엔진이 요구하는 1024x1024 크기로 강제 리사이징!
        const resizedImageBuffer = await sharp(req.file.buffer)
            .resize(1024, 1024, { fit: 'cover' }) 
            .png() 
            .toBuffer();

        console.log("✂️ 리사이징 완료! 1024x1024 변환 성공");

        const formData = new FormData();
        formData.append('init_image', resizedImageBuffer, {
            filename: 'upload.png',
            contentType: 'image/png',
        });
        
        formData.append('text_prompts[0][text]', req.body.prompt + ", master-piece pixel art, 8-bit, 128x128");
        formData.append('text_prompts[0][weight]', 1);
        formData.append('cfg_scale', 7);
        formData.append('samples', 1);

        // 🔥 [수정됨] 현재 100% 확실하게 살아있는 최신 SDXL 엔진 주소 적용
        const response = await axios.post(
            'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image',
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    Accept: 'application/json',
                    Authorization: `Bearer ${STABILITY_API_KEY}`,
                },
            }
        );

        const base64Image = response.data.artifacts[0].base64;
        const finalImageUrl = `data:image/png;base64,${base64Image}`;

        res.json({
            success: true,
            pixelImageUrl: finalImageUrl
        });

    } catch (error) {
        console.error("❌ AI 서버 에러:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "변환 중 에러가 발생했습니다!" });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 최신 SDXL 엔진이 적용된 서버 가동 중! (http://localhost:${PORT})`);
});
