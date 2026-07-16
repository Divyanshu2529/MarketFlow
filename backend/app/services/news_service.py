import os
import httpx
from dotenv import load_dotenv

load_dotenv()

NEWS_API_KEY = os.getenv("NEWS_API_KEY")

if not NEWS_API_KEY:
    raise RuntimeError("NEWS_API_KEY is missing from .env")

NEWS_API_BASE_URL = "https://newsapi.org/v2"


async def get_company_news(company_name: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{NEWS_API_BASE_URL}/everything",
            params={
                "q": company_name,
                "language": "en",
                "sortBy": "publishedAt",
                "pageSize": 10,
                "apiKey": NEWS_API_KEY,
            },
        )

        response.raise_for_status()
        data = response.json()

        articles = data.get("articles", [])

        return [
            {
                "title": article.get("title"),
                "publisher": article.get("source", {}).get("name"),
                "publishedDate": article.get("publishedAt"),
                "url": article.get("url"),
                "image": article.get("urlToImage"),
                "summary": article.get("description"),
            }
            for article in articles
        ]