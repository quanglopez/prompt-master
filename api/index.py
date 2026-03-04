#!/usr/bin/env python3
"""Prompt Master API — FastAPI backend for prompt enhancement via OpenRouter."""

import json
from datetime import date
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
from openai import OpenAI

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use OpenRouter with OpenAI-compatible SDK
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY", "sk-placeholder"),
)

# ===== USAGE TRACKING (in-memory, resets on server restart) =====
# Key: (user_id, date_str) -> count
usage_tracker: dict = {}

PLAN_LIMITS = {
    "free": 3,
    "student": 30,
    "pro": 999999,
    "yearly": 999999,
}

def get_usage(user_id: str) -> int:
    """Get today's usage for a user."""
    today = date.today().isoformat()
    return usage_tracker.get((user_id, today), 0)

def increment_usage(user_id: str) -> int:
    """Increment and return today's usage for a user."""
    today = date.today().isoformat()
    key = (user_id, today)
    usage_tracker[key] = usage_tracker.get(key, 0) + 1
    return usage_tracker[key]


PROMPT_TYPE_INSTRUCTIONS = {
    "auto": "Tự động phát hiện loại prompt và tối ưu hóa phù hợp.",
    "standard": "Tối ưu hóa prompt theo chuẩn chung: rõ ràng, cụ thể, có cấu trúc.",
    "research": "Tối ưu cho nghiên cứu: thêm phương pháp luận, nguồn tham khảo, tiêu chí đánh giá, yêu cầu phân tích sâu.",
    "writing": "Tối ưu cho viết lách: thêm giọng văn, đối tượng đọc, cấu trúc bài viết, phong cách, độ dài mong muốn.",
    "planning": "Tối ưu cho lập kế hoạch: thêm mục tiêu cụ thể, timeline, KPI, rủi ro, nguồn lực cần thiết.",
    "image": "Tối ưu cho tạo hình ảnh: thêm chi tiết về phong cách nghệ thuật, bố cục, ánh sáng, màu sắc, góc chụp, chất liệu.",
    "video": "Tối ưu cho tạo video: thêm chi tiết về cảnh quay, chuyển động camera, âm thanh, nhịp độ, hiệu ứng.",
    "code": "Tối ưu cho lập trình: thêm ngôn ngữ, framework, yêu cầu hiệu năng, xử lý lỗi, cấu trúc code, best practices.",
    "automation": "Tối ưu cho tự động hóa: thêm luồng xử lý, điều kiện, input/output, xử lý ngoại lệ, tích hợp hệ thống.",
}

CREATIVITY_INSTRUCTIONS = {
    "precise": "Giữ prompt chính xác, tập trung, không mở rộng quá nhiều. Ưu tiên độ rõ ràng và cụ thể.",
    "balanced": "Cân bằng giữa sáng tạo và chính xác. Thêm chi tiết hữu ích nhưng không đi quá xa khỏi ý định ban đầu.",
    "creative": "Mở rộng sáng tạo tối đa. Thêm nhiều ý tưởng mới, góc nhìn độc đáo, và chi tiết phong phú.",
}

RULES_MAP = {
    "no_ai_tone": "QUAN TRỌNG: Viết prompt yêu cầu AI trả lời bằng giọng tự nhiên như con người, tránh giọng văn AI sáo rỗng, không dùng các cụm từ mở đầu như 'Chắc chắn rồi!', 'Tuyệt vời!'.",
    "examples": "Luôn thêm ví dụ cụ thể vào prompt để AI hiểu rõ kỳ vọng đầu ra.",
    "concise": "Giữ prompt ngắn gọn, súc tích. Không thêm quá nhiều chi tiết không cần thiết.",
    "context": "Thêm context rõ ràng: ai là người dùng, mục đích sử dụng, bối cảnh cụ thể.",
}


def build_system_prompt(prompt_type: str, creativity: str, rules: list) -> str:
    type_instruction = PROMPT_TYPE_INSTRUCTIONS.get(prompt_type, PROMPT_TYPE_INSTRUCTIONS["auto"])
    creativity_instruction = CREATIVITY_INSTRUCTIONS.get(creativity, CREATIVITY_INSTRUCTIONS["balanced"])

    rules_text = ""
    if rules:
        active_rules = [RULES_MAP[r] for r in rules if r in RULES_MAP]
        if active_rules:
            rules_text = "\n\nCÁC QUY TẮC BẮT BUỘC ÁP DỤNG:\n" + "\n".join(f"- {r}" for r in active_rules)

    return f"""Bạn là chuyên gia tối ưu hóa prompt AI hàng đầu. Nhiệm vụ của bạn là biến những prompt thô sơ, thiếu chi tiết thành prompt chất lượng cao, chi tiết và hiệu quả.

LOẠI PROMPT: {type_instruction}

ĐỘ SÁNG TẠO: {creativity_instruction}
{rules_text}

QUY TRÌNH LÀM VIỆC:
1. Phân tích prompt gốc: xác định ý định, điểm yếu, thông tin thiếu
2. Viết lại prompt hoàn chỉnh với:
   - Vai trò rõ ràng cho AI (nếu phù hợp)
   - Bối cảnh và mục đích cụ thể
   - Yêu cầu chi tiết, có cấu trúc
   - Định dạng đầu ra mong muốn
   - Ràng buộc và tiêu chí chất lượng
   - Ví dụ minh họa (nếu cần)
3. Đưa ra 2-3 mẹo ngắn gọn để người dùng có thể cải thiện prompt thêm

ĐỊNH DẠNG ĐẦU RA:
Trả về đúng format JSON sau (không thêm markdown code block):
{{
  "enhanced": "prompt đã được tối ưu hóa ở đây",
  "tips": ["mẹo 1", "mẹo 2", "mẹo 3"]
}}

QUAN TRỌNG:
- Trả lời hoàn toàn bằng tiếng Việt
- Prompt tối ưu phải hay hơn hẳn prompt gốc
- Tips phải ngắn gọn, thực tế, áp dụng được ngay
- Chỉ trả về JSON, không thêm text nào khác"""


class EnhanceRequest(BaseModel):
    prompt: str
    type: str = "auto"
    creativity: str = "balanced"
    rules: list = []
    user_id: str = "anonymous"
    plan: str = "free"


@app.post("/api/enhance")
async def enhance_prompt(req: EnhanceRequest):
    # Check usage limit
    current_usage = get_usage(req.user_id)
    limit = PLAN_LIMITS.get(req.plan, 3)

    if current_usage >= limit:
        async def limit_error():
            yield f"data: {json.dumps({'type': 'error', 'message': f'Bạn đã dùng hết {limit} lượt hôm nay. Vui lòng nâng cấp gói hoặc thử lại ngày mai.'})}\n\n"
        return StreamingResponse(limit_error(), media_type="text/event-stream")

    system_prompt = build_system_prompt(req.type, req.creativity, req.rules)

    async def generate():
        try:
            # Check if API key is configured
            api_key = os.environ.get("OPENROUTER_API_KEY")
            if not api_key:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Server chưa cấu hình API key. Vui lòng liên hệ admin.'})}\n\n"
                return

            stream = client.chat.completions.create(
                model=os.environ.get("OPENROUTER_MODEL", "anthropic/claude-sonnet-4-20250514"),
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Hãy tối ưu hóa prompt sau:\n\n{req.prompt}"},
                ],
                max_tokens=2048,
                stream=True,
                extra_headers={
                    "HTTP-Referer": "https://promptmaster.sbs",
                    "X-Title": "Prompt Master",
                },
            )

            full_text = ""
            for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                if delta.content:
                    full_text += delta.content
                    yield f"data: {json.dumps({'type': 'chunk', 'content': delta.content})}\n\n"

            # Increment usage on success
            new_usage = increment_usage(req.user_id)

            # Try to parse the full response as JSON
            try:
                json_str = full_text.strip()
                if json_str.startswith("```"):
                    json_str = json_str.split("\n", 1)[1]
                    json_str = json_str.rsplit("```", 1)[0]
                parsed = json.loads(json_str)
                yield f"data: {json.dumps({'type': 'done', 'enhanced': parsed.get('enhanced', full_text), 'tips': parsed.get('tips', []), 'usage': new_usage})}\n\n"
            except (json.JSONDecodeError, Exception):
                yield f"data: {json.dumps({'type': 'done', 'enhanced': full_text, 'tips': [], 'usage': new_usage})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "X-Content-Type-Options": "nosniff",
            "Access-Control-Allow-Origin": "*",
        },
    )


@app.get("/api/usage/{user_id}")
def get_user_usage(user_id: str):
    """Get today's usage for a user."""
    return {"usage": get_usage(user_id), "date": date.today().isoformat()}


@app.get("/api/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
