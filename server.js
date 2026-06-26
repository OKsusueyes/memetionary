const express = require('express');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp'); // ✂️ 사진 크기를 알아서 맞춰줄 마법의 가위 등장!

const app = express();
const PORT = process.env.PORT || 3000;

// 🚨 발급받은 진짜 API 키를 꼭 넣어주세요!
const STABILITY_API_KEY = 'sk-DK7E2Dx931AJkpUBFIehIgvep2sofBjukpFyZ2Pam8UizKgc';

// 사진을 메모리에 임시 저장
const upload = multer({ storage: multer.memoryStorage() });
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/pixelate', upload.single('photo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "사진이 없습니다!" });

    try {
        console.log("📸 원본 사진 업로드 됨! 크기:", req.file.size, "bytes");

        // 🔥 [핵심 로직] AI가 거절하지 못하도록 512x512 정방형으로 강제 리사이징!
        // 아무리 크거나 작은 사진이 들어와도 비율 유지하면서 예쁘게 잘라줍니다.
        const resizedImageBuffer = await sharp(req.file.buffer)
            .resize(512, 512, { fit: 'cover' }) 
            .png() // PNG 포맷으로 깔끔하게 변환
            .toBuffer();

        console.log("✂️ 리사이징 완료! 이제 AI가 좋아하는 크기입니다.");

        // Stability AI에 보낼 소포 포장
        const formData = new FormData();
        formData.append('init_image', resizedImageBuffer, {
            filename: 'upload.png',
            contentType: 'image/png',
        });
        
        // 프롬프트 세팅
        formData.append('text_prompts[0][text]', req.body.prompt + ", master-piece pixel art, 8-bit, 128x128");
        formData.append('text_prompts[0][weight]', 1);
        formData.append('cfg_scale', 7);
        formData.append('samples', 1);

        // AI 서버로 발송
        const response = await axios.post(
            'https://api.stability.ai/v1/generation/stable-diffusion-v1-5/image-to-image',
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    Accept: 'application/json',
                    Authorization: `Bearer ${STABILITY_API_KEY}`,
                },
            }
        );

        // AI의 결과물 전달
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

// 홈페이지 띄우기
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 자동 리사이징 기능이 추가된 서버 가동 중! (http://localhost:${PORT})`);
});
