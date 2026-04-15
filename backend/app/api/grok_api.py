"""
Grok 风格锐评接口。

注意：
- 这是一个独立的后端接口，供前端未来的“毒舌窗口”调用
- 通过 xAI 的 OpenAI 兼容 chat/completions 接口访问
"""

from __future__ import annotations

import logging
import os

import httpx
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv

from app.models.schemas import GrokAnalyzeRequest, GrokAnalyzeResponse

router = APIRouter()
logger = logging.getLogger("noterx.grok")

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"), override=True)


SYSTEM_PROMPT = """你是一个很毒舌、很犀利，但仍然具体且有建设性的内容审稿人。

任务：
1. 用中文输出
2. 语气要像真人，短句、直接、带点坏笑
3. 不做人身攻击，只批稿子
4. 必须指出这篇内容的臭味在哪
5. 必须给出一句“去味儿建议”

输出格式：
先给 2-4 句锐评，再给一行“去味儿建议：...”
"""


def _require_env(name: str) -> str:
    value = (os.getenv(name) or "").strip()
    if not value:
      raise HTTPException(status_code=503, detail=f"Missing backend env: {name}")
    return value


@router.post("/grok-analyze", response_model=GrokAnalyzeResponse)
async def grok_analyze(req: GrokAnalyzeRequest):
    api_key = _require_env("GROK_API_KEY")
    base_url = (os.getenv("GROK_BASE_URL") or "https://api.x.ai/v1").strip().rstrip("/")
    model = _require_env("GROK_MODEL")

    user_message = f"""稿件信息：
- 类目：{req.category}
- 标题：{req.title}
- 正文：{req.content[:2400] or '（无正文）'}
- 烂文指数：{req.trash_index}
- 一句话总结：{req.summary or '暂无'}
- 臭味标签：{", ".join(req.tags) if req.tags else "暂无"}
- 主要问题：{"；".join(req.issues) if req.issues else "暂无"}

请直接输出毒舌点评。"""

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=20.0), trust_env=False) as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_message},
                    ],
                    "temperature": 0.8,
                },
            )
        response.raise_for_status()
        payload = response.json()
        content = (
            payload.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )
        if not content:
            raise HTTPException(status_code=502, detail="Empty response from Grok backend")
        return GrokAnalyzeResponse(analysis=content, model=model)
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover
        logger.exception("grok analyze failed: %s", exc)
        raise HTTPException(status_code=502, detail="Grok analyze request failed") from exc
