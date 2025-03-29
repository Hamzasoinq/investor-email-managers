import httpx
import os
import logging
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timedelta
from dotenv import load_dotenv
from cachetools import TTLCache

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("piplai")

load_dotenv()

class PiplAPI:
    def __init__(self):
        self.api_key = os.getenv("PIPL_API_KEY", "6fc126c4-04e5c9d5-87b13817-eedc8acc")
        self.base_url = "https://api.pipl.ai/api/v1"
        self.workspace_id = os.getenv("PIPL_WORKSPACE_ID", "67bd12283f02ce58fa6fb65d")
        self.headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        # Cache for emails with 5-minute TTL
        self.email_cache = TTLCache(maxsize=100, ttl=300)
        # Cache for labels with 1-hour TTL
        self.label_cache = TTLCache(maxsize=100, ttl=3600)
        logger.info(f"Initialized PiplAPI with workspace_id: {self.workspace_id}")

    async def get_emails(self, 
                        preview_only: bool = True,
                        lead_email: Optional[str] = None,
                        campaign_id: Optional[str] = None,
                        email_type: str = "all",
                        label: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch emails from Pipl.ai Unibox"""
        cache_key = f"{preview_only}:{lead_email}:{campaign_id}:{email_type}:{label}"
        
        # Check cache first
        if cache_key in self.email_cache:
            return self.email_cache[cache_key]

        # Only include supported parameters
        params = {
            "workspace_id": self.workspace_id,
            "preview_only": "true" if preview_only else "false",
            "email_type": email_type
        }
        if lead_email:
            params["lead"] = lead_email
        if campaign_id:
            params["campaign_id"] = campaign_id
        if label:
            params["label"] = label

        logger.debug(f"Sending request to {self.base_url}/unibox/emails with params: {params}")

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/unibox/emails",
                    headers=self.headers,
                    params=params
                )
                response.raise_for_status()
                data = response.json()
                
                # Transform and clean up emails
                emails = data.get("data", [])
                for email in emails:
                    # Ensure required fields exist
                    email["id"] = email.get("id", "")
                    email["message_id"] = email.get("message_id", "")
                    email["subject"] = email.get("subject", "")
                    email["from_address_email"] = email.get("from_address_email", "")
                    email["from_address_json"] = email.get("from_address_json", [{"address": email.get("from_address_email", ""), "name": ""}])
                    email["to_address_json"] = email.get("to_address_json", [])
                    email["cc_address_json"] = email.get("cc_address_json", [])
                    email["timestamp_created"] = email.get("timestamp_created")
                    email["content_preview"] = email.get("content_preview", "")
                    
                    # If not preview_only, fetch the full email thread
                    if not preview_only and email.get("thread_id"):
                        try:
                            thread_response = await client.get(
                                f"{self.base_url}/unibox/thread/{email['thread_id']}",
                                headers=self.headers,
                                params={"workspace_id": self.workspace_id}
                            )
                            thread_response.raise_for_status()
                            thread_data = thread_response.json()
                            email["thread"] = thread_data.get("data", [])
                            
                            # Get the full body of the current email from the thread
                            for thread_email in email["thread"]:
                                if thread_email.get("id") == email["id"]:
                                    body = thread_email.get("body", {})
                                    if isinstance(body, str):
                                        email["body"] = {"text": body, "html": body}
                                    elif isinstance(body, dict):
                                        email["body"] = {
                                            "text": body.get("text", ""),
                                            "html": body.get("html", "")
                                        }
                                    break
                        except httpx.HTTPError as e:
                            logger.warning(f"Error fetching thread {email.get('thread_id')}: {str(e)}")
                            if hasattr(e, 'response') and e.response is not None:
                                logger.warning(f"Response content: {e.response.text}")
                            email["thread"] = []
                    else:
                        # Handle email body for preview
                        body = email.get("body")
                        if isinstance(body, str):
                            email["body"] = {"text": body, "html": body}
                        elif isinstance(body, dict):
                            email["body"] = {
                                "text": body.get("text", ""),
                                "html": body.get("html", "")
                            }
                        else:
                            email["body"] = {"text": "", "html": ""}
                        email["thread"] = []
                    
                    # Handle other fields
                    email["label"] = email.get("label")
                    email["campaign_id"] = email.get("campaign_id")
                    email["lead_id"] = email.get("lead_id")
                    email["thread_id"] = email.get("thread_id")
                    email["is_unread"] = email.get("is_unread", False)
                
                # Cache all emails
                self.email_cache[cache_key] = emails
                return emails
                
        except httpx.HTTPError as e:
            logger.error(f"Error fetching emails: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response content: {e.response.text}")
            raise

    async def send_email(self, to: str, subject: str, body: str, reply_to_id: Optional[str] = None) -> Dict[str, Any]:
        """Send email through Pipl.ai"""
        sender_email = os.getenv("PIPL_SENDER_EMAIL", "noreply@caeros.com")
        sender_name = os.getenv("PIPL_SENDER_NAME", "Diana Moreno")
        sender = f"{sender_name} <{sender_email}>" if sender_name else sender_email
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                if reply_to_id:
                    # Reply to existing email
                    data = {
                        "workspace_id": self.workspace_id,
                        "reply_to_id": reply_to_id,
                        "subject": subject,
                        "to": to,
                        "body": body,
                        "from": sender
                    }
                    logger.debug(f"Sending reply with data: {data}")
                    
                    response = await client.post(
                        f"{self.base_url}/unibox/emails/reply",
                        headers=self.headers,
                        json=data
                    )
                    response.raise_for_status()
                    return response.json()
                else:
                    # Add lead and send campaign email
                    data = {
                        "workspace_id": self.workspace_id,
                        "campaign_id": os.getenv("PIPL_DEFAULT_CAMPAIGN_ID"),
                        "leads": [{
                            "email": to,
                            "custom_variables": {
                                "initial_subject": subject,
                                "initial_body": body
                            }
                        }]
                    }
                    logger.debug(f"Sending new email with data: {data}")
                    
                    response = await client.post(
                        f"{self.base_url}/lead/add",
                        headers=self.headers,
                        json=data
                    )
                    response.raise_for_status()
                    return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error sending email: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response content: {e.response.text}")
            raise

    async def get_campaigns(self) -> List[Dict[str, Any]]:
        """Get all campaigns"""
        params = {"workspace_id": self.workspace_id}
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/campaign/list/all",
                    headers=self.headers,
                    params=params
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error fetching campaigns: {str(e)}")
            # Return empty list instead of raising an error
            return []

    async def add_lead_to_sequence(self, email: str, sequence_id: str) -> Dict[str, Any]:
        """Add a lead to a follow-up sequence"""
        data = {
            "workspace_id": self.workspace_id,
            "subseq_id": sequence_id,
            "parent_lead_ids": [email]
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/lead/add-lead-in-subseq",
                    headers=self.headers,
                    json=data
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error adding lead to sequence: {str(e)}")
            raise

    async def get_tags(self) -> List[Dict[str, Any]]:
        """Get all tags"""
        params = {"workspace_id": self.workspace_id}
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/tag/list",
                    headers=self.headers,
                    params=params
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error fetching tags: {str(e)}")
            # Return empty list instead of raising an error
            return []

    async def update_lead(self, email: str, campaign_id: str, variables: Dict[str, Any]) -> Dict[str, Any]:
        """Update lead variables including tags"""
        data = {
            "workspace_id": self.workspace_id,
            "campaign_id": campaign_id,
            "email": email,
            "variables": variables
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/lead/data/update",
                    headers=self.headers,
                    json=data
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error updating lead: {str(e)}")
            raise

    async def get_analytics(self, campaign_id: Optional[str] = None) -> Dict[str, Any]:
        """Get campaign analytics"""
        params = {
            "workspace_id": self.workspace_id
        }
        if campaign_id:
            params["campaign_id"] = campaign_id

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/analytics/campaign/stats",
                    headers=self.headers,
                    params=params
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error fetching analytics: {str(e)}")
            # Return empty stats instead of raising an error
            return {"stats": {}}

    async def get_labels(self) -> List[str]:
        """Get available email labels with caching"""
        # Check cache first
        if "labels" in self.label_cache:
            return self.label_cache["labels"]
        
        params = {"workspace_id": self.workspace_id}
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # First try the unibox/labels endpoint
                try:
                    response = await client.get(
                        f"{self.base_url}/unibox/labels",
                        headers=self.headers,
                        params=params
                    )
                    response.raise_for_status()
                    labels = response.json().get("labels", [])
                    self.label_cache["labels"] = labels
                    return labels
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 404:
                        # If labels endpoint not found, try getting labels from tags
                        response = await client.get(
                            f"{self.base_url}/tag/list",
                            headers=self.headers,
                            params=params
                        )
                        response.raise_for_status()
                        tags = response.json()
                        labels = [tag.get("name", "").upper().replace(" ", "_") for tag in tags if tag.get("name")]
                        self.label_cache["labels"] = labels
                        return labels
                    raise
        except httpx.HTTPError as e:
            logger.error(f"Error fetching labels: {str(e)}")
            # Return default labels if API fails
            default_labels = [
                "INTERESTED",
                "NOT_INTERESTED",
                "MEETING_BOOKED",
                "FOLLOW_UP",
                "WRONG_PERSON",
                "QUALIFIED",
                "NOT_QUALIFIED",
                "CONTACTED",
                "RESPONDED",
                "NO_RESPONSE"
            ]
            self.label_cache["labels"] = default_labels
            return default_labels

    async def update_email_label(self, email_id: str, label: str) -> Dict[str, Any]:
        """Update email label"""
        data = {
            "workspace_id": self.workspace_id,
            "email_id": email_id,
            "label": label
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/unibox/emails/label",
                    headers=self.headers,
                    json=data
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error updating email label: {str(e)}")
            raise

    def invalidate_email_cache(self):
        """Clear the email cache"""
        self.email_cache.clear()

    def invalidate_label_cache(self):
        """Clear the label cache"""
        self.label_cache.clear()

    async def get_leads(
        self,
        campaign_id: Optional[str] = None,
        status: Optional[str] = None,
        label: Optional[str] = None,
        email: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        page: Optional[int] = 1,
        limit: Optional[int] = 10,
        sort: Optional[str] = "_id",
        direction: Optional[str] = "asc"
    ) -> Dict[str, Any]:
        """Get leads from Pipl.ai API with filtering and pagination"""
        
        # Base parameters
        params = {
            "workspace_id": self.workspace_id,
        }
        
        # Add optional parameters (only if they have a value)
        if campaign_id:
            params["campaign_id"] = campaign_id
        if status:
            params["status"] = status
        if label:
            params["label"] = label
        if email:
            params["email"] = email
        if first_name:
            params["first_name"] = first_name
        if last_name:
            params["last_name"] = last_name
        if page:
            params["page"] = str(page)
        if limit:
            params["limit"] = str(limit)
        if sort:
            params["sort"] = sort
        if direction:
            params["direction"] = direction
        
        logger.info(f"Fetching leads with params: {params}")
            
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/lead/workspace-leads",
                    headers=self.headers,
                    params=params
                )
                response.raise_for_status()
                data = response.json()
                
                # Ensure we return a consistent response format
                if isinstance(data, dict) and "data" in data:
                    # API already returned properly formatted data
                    logger.info(f"Successfully fetched leads: {len(data['data'])} items")
                    return data
                elif isinstance(data, dict) and "_id" in data:
                    # Single lead object was returned
                    logger.info("Successfully fetched a single lead")
                    return {
                        "data": [data],
                        "total": 1,
                        "page": page,
                        "limit": limit
                    }
                elif isinstance(data, list):
                    # List of leads was returned
                    logger.info(f"Successfully fetched leads: {len(data)} items")
                    return {
                        "data": data,
                        "total": len(data),
                        "page": page,
                        "limit": limit
                    }
                else:
                    # Unknown format, return empty data
                    logger.warning(f"Unexpected response format from API: {type(data)}")
                    return {
                        "data": [],
                        "total": 0,
                        "page": page,
                        "limit": limit
                    }
        except httpx.HTTPError as e:
            logger.error(f"Error fetching leads: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response content: {e.response.text}")
            # Return empty data on error instead of raising
            return {
                "data": [],
                "total": 0,
                "page": page,
                "limit": limit
            }

# Create a singleton instance
pipl_api = PiplAPI() 