from __future__ import annotations

import os

import httpx
from fastapi import HTTPException

from app.models import VideoResource


YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"


async def search_youtube_videos(topic_name: str, max_results: int) -> list[VideoResource]:
    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="YOUTUBE_API_KEY is missing. Add it to the backend environment.",
        )

    params = {
        "part": "snippet",
        "q": topic_name,
        "type": "video",
        "maxResults": max_results,
        "key": api_key,
        "videoEmbeddable": "true",
        "safeSearch": "strict",
        "order": "relevance",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(YOUTUBE_SEARCH_URL, params=params)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="Failed to reach YouTube API.",
        ) from exc

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"YouTube API request failed with status {response.status_code}.",
        )

    payload = response.json()
    items = payload.get("items", [])
    videos: list[VideoResource] = []

    for item in items:
        video_id = item.get("id", {}).get("videoId")
        snippet = item.get("snippet", {})
        thumbnails = snippet.get("thumbnails", {})
        thumbnail = (
            thumbnails.get("high")
            or thumbnails.get("medium")
            or thumbnails.get("default")
            or {}
        )

        if not video_id:
            continue

        videos.append(
            VideoResource(
                video_id=video_id,
                title=snippet.get("title", "Untitled video"),
                description=snippet.get("description", ""),
                channel_title=snippet.get("channelTitle", "Unknown channel"),
                published_at=snippet["publishedAt"],
                thumbnail_url=thumbnail.get(
                    "url", "https://i.ytimg.com/vi/default/default.jpg"
                ),
                url=f"https://www.youtube.com/watch?v={video_id}",
            )
        )

    if len(videos) < 3:
        raise HTTPException(
            status_code=404,
            detail="YouTube returned fewer than 3 usable videos for this topic.",
        )

    return videos
