const express = require('express');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const app = express();

const PORT = process.env.PORT || 3000;

// 🚨 [필수] 방금 발급받은 진짜 API 키를 아래에 꼭 넣어줘!! 🚨
const STABILITY_API_KEY = 'sk-DK7E2Dx931AJkpUBFIehIgvep2sofBjukpFyZ2Pam8UizKgc';

// 사진을 메모리에 임시 저장
const upload = multer({ storage: multer.memoryStorage() });
app.use(express.static(path.join(__dirname, 'public')));

// 🔥 찐 AI 변환 라우터! 🔥
app.post('/api/pixelate', upload.single('photo'), async (req, res) => {
    // 1. 에러 체크
    if (!req.file) return res.status(400).json({ error: "사진이 없습니다!" });
    if (STABILITY_API_KEY.includes('여기에_')) {
        console.log("❌ API 키 안 넣었음!");
        return res.status(400).json({ error: "API 키 세팅이 안 됐어!" });
    }

    const userPhoto = req.file;
    const aiPrompt = req.body.prompt;

    console.log("📸 진짜 AI 변환 시작! 사진 크기:", userPhoto.size);

    try {
        // 2. Stability AI(스테이블 디퓨전)에 보낼 소포(FormData) 싸기
        const formData = new FormData();
        formData.append('init_image', userPhoto.buffer, {
            filename: 'upload.png',
            contentType: userPhoto.mimetype,
        });
        
        // 인영님의 프롬프트 + 픽셀아트 강제 옵션 추가!
        formData.append('text_prompts[0][text]', aiPrompt + ", master-piece pixel art, 8-bit, 128x128");
        formData.append('text_prompts[0][weight]', 1);
        formData.append('cfg_scale', 7); // 프롬프트를 얼마나 강하게 적용할지
        formData.append('samples', 1);

        // 3. AI 서버로 소포 발송! (두근두근)
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

        // 4. AI가 그려준 그림을 Base64(문자열) 형태로 받아서 프론트엔드로 전달!
        const base64Image = response.data.artifacts[0].base64;
        const finalImageUrl = `data:image/png;base64,${base64Image}`;

        res.json({
            success: true,
            pixelImageUrl: finalImageUrl // 이제 피카츄 아니고 진짜 변환된 이미지!
        });

    } catch (error) {
        // 에러 나면 터미널에 이유를 자세히 알려줌
        console.error("❌ AI 서버 에러:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "AI 서버가 아파요 ㅠㅠ 터미널을 확인해봐!" });
    }
});

// 홈페이지 띄우기
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 찐 AI 띠부실 서버 가동 중! (http://localhost:${PORT})`);
});
