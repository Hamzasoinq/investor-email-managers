from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
import yaml
from pathlib import Path
import os
import logging
from dotenv import load_dotenv
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, EmailStr
from piplai import pipl_api
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("main")

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Caeros API",
    description="Email management and automation system for investor communications",
    version="1.0.0",
    docs_url=None,  # Disable default docs
    redoc_url=None  # Disable default redoc
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Load OpenAPI specification
openapi_path = Path(__file__).parent / "openapi.yaml"
with open(openapi_path, "r") as f:
    openapi_spec = yaml.safe_load(f)

def custom_openapi():
    return openapi_spec

app.openapi = custom_openapi

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="Caeros API Documentation",
        swagger_favicon_url="/favicon.ico"
    )

@app.get("/openapi.json", include_in_schema=False)
async def get_openapi_json():
    return openapi_spec

class EmailAddress(BaseModel):
    address: str
    name: Optional[str] = None

class EmailBody(BaseModel):
    text: Optional[str] = None
    html: Optional[str] = None

class PiplEmail(BaseModel):
    id: str
    message_id: str
    subject: str
    from_address_email: str
    from_address_json: List[EmailAddress]
    to_address_json: List[EmailAddress]
    cc_address_json: Optional[List[EmailAddress]] = None
    timestamp_created: Optional[str] = None
    content_preview: str
    body: EmailBody
    label: Optional[str] = None
    campaign_id: Optional[str] = None
    lead_id: Optional[str] = None
    thread_id: Optional[str] = None
    is_unread: Optional[bool] = None

class SendEmailRequest(BaseModel):
    to: EmailStr
    subject: str
    body: str
    reply_to_id: Optional[str] = None

class TagRequest(BaseModel):
    email: EmailStr
    campaign_id: str
    tags: List[str]

@app.get("/")
async def root():
    return {"message": "Welcome to Investor Email Manager API"}

@app.get("/api/emails")
async def get_emails(
    preview_only: bool = True,
    email_type: str = "all",
    label: Optional[str] = None,
    lead_email: Optional[str] = None,
    campaign_id: Optional[str] = None
):
    """Get emails from Pipl.ai"""
    try:
        emails = await pipl_api.get_emails(
            preview_only=preview_only,
            lead_email=lead_email,
            campaign_id=campaign_id,
            email_type=email_type,
            label=label
        )
        return emails
    except Exception as e:
        logger.error(f"Error in get_emails endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/emails/send")
async def send_email(data: SendEmailRequest):
    """Send email through Pipl.ai"""
    try:
        response = await pipl_api.send_email(
            to=data.to,
            subject=data.subject,
            body=data.body,
            reply_to_id=data.reply_to_id
        )
        return response
    except Exception as e:
        logger.error(f"Error in send_email endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/campaigns")
async def get_campaigns():
    """Get all campaigns"""
    try:
        return await pipl_api.get_campaigns()
    except Exception as e:
        logger.error(f"Error in get_campaigns endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/leads/sequence")
async def add_to_sequence(email: EmailStr, sequence_id: str):
    """Add a lead to a sequence"""
    try:
        return await pipl_api.add_lead_to_sequence(email, sequence_id)
    except Exception as e:
        logger.error(f"Error in add_to_sequence endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tags")
async def get_tags():
    """Get all tags"""
    try:
        return await pipl_api.get_tags()
    except Exception as e:
        logger.error(f"Error in get_tags endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tags")
async def update_tags(request: TagRequest):
    """Update lead tags"""
    try:
        return await pipl_api.update_lead(
            email=request.email,
            campaign_id=request.campaign_id,
            variables={"tags": request.tags}
        )
    except Exception as e:
        logger.error(f"Error in update_tags endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics")
async def get_analytics(campaign_id: Optional[str] = None):
    """Get campaign analytics"""
    try:
        return await pipl_api.get_analytics(campaign_id)
    except Exception as e:
        logger.error(f"Error in get_analytics endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/labels")
async def get_labels():
    """Get available email labels"""
    try:
        return await pipl_api.get_labels()
    except Exception as e:
        logger.error(f"Error in get_labels endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/emails/{email_id}/label")
async def update_email_label(email_id: str, label: str):
    """Update email label"""
    try:
        return await pipl_api.update_email_label(email_id, label)
    except Exception as e:
        logger.error(f"Error in update_email_label endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/emails/mark-read/{thread_id}")
async def mark_email_read(thread_id: str):
    """Mark email thread as read"""
    try:
        data = {"workspace_id": os.getenv("PIPL_WORKSPACE_ID")}
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{pipl_api.base_url}/unibox/threads/{thread_id}/mark-as-read",
                headers=pipl_api.headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Error in mark_email_read endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/emails/unread/count")
async def get_unread_count():
    """Get count of unread emails"""
    try:
        params = {"workspace_id": os.getenv("PIPL_WORKSPACE_ID")}
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{pipl_api.base_url}/unibox/emails/count/unread",
                headers=pipl_api.headers,
                params=params
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Error in get_unread_count endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/leads")
async def get_leads(
    campaign_id: Optional[str] = None,
    status: Optional[str] = None,
    label: Optional[str] = None,
    email: Optional[str] = None,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    page: int = 1,
    limit: int = 10,
    sort: str = "_id",
    direction: str = "asc"
):
    """Get leads/contacts from Pipl.ai API"""
    try:
        # The PiplAPI.get_leads now returns a consistent response format
        return await pipl_api.get_leads(
            campaign_id=campaign_id,
            status=status,
            label=label,
            email=email,
            first_name=first_name,
            last_name=last_name,
            page=page,
            limit=limit,
            sort=sort,
            direction=direction
        )
    except Exception as e:
        logger.error(f"Error in get_leads endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 