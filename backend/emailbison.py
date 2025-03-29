import httpx
import os
from dotenv import load_dotenv
from typing import List, Dict, Any
from datetime import datetime

load_dotenv()

class EmailBisonAPI:
    def __init__(self):
        self.api_key = os.getenv("EMAILBISON_API_KEY")
        self.base_url = "https://api.emailbison.com/v1"  # Replace with actual EmailBison API URL
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def get_emails(self, folder: str = "inbox") -> List[Dict[str, Any]]:
        """Fetch emails from EmailBison API"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/emails",
                headers=self.headers,
                params={"folder": folder}
            )
            response.raise_for_status()
            return response.json()

    async def send_email(self, to: str, subject: str, body: str) -> Dict[str, Any]:
        """Send email through EmailBison API"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/send",
                headers=self.headers,
                json={
                    "to": to,
                    "subject": subject,
                    "body": body
                }
            )
            response.raise_for_status()
            return response.json()

    async def create_sequence(self, name: str, steps: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create a follow-up sequence"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/sequences",
                headers=self.headers,
                json={
                    "name": name,
                    "steps": steps
                }
            )
            response.raise_for_status()
            return response.json()

    async def add_to_sequence(self, sequence_id: str, contact_email: str) -> Dict[str, Any]:
        """Add a contact to a sequence"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/sequences/{sequence_id}/contacts",
                headers=self.headers,
                json={
                    "email": contact_email
                }
            )
            response.raise_for_status()
            return response.json()

    async def get_sequence_status(self, sequence_id: str, contact_email: str) -> Dict[str, Any]:
        """Get the status of a contact in a sequence"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/sequences/{sequence_id}/contacts/{contact_email}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()

# Create a singleton instance
emailbison = EmailBisonAPI() 