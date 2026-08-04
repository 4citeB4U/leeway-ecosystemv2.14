"""
Agent Lee Seafile Integration Module
Provides autonomous access to Seafile file storage system
"""

import requests
import json
from typing import Optional, Dict, List

class AgentLeeSeafileClient:
    """Client for Agent Lee to interact with Seafile autonomously"""
    
    def __init__(self, base_url: str = "http://127.0.0.1:8082"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api2"
        self.token: Optional[str] = None
        
    def authenticate(self, username: str, password: str) -> bool:
        """Authenticate and get API token"""
        try:
            response = requests.post(
                f"{self.api_base}/auth-token/",
                data={"username": username, "password": password}
            )
            if response.status_code == 200:
                self.token = response.json().get("token")
                return True
            return False
        except Exception as e:
            print(f"Authentication failed: {e}")
            return False
    
    def get_headers(self) -> Dict[str, str]:
        """Get headers with authentication token"""
        return {"Authorization": f"Token {self.token}"}
    
    def list_libraries(self) -> List[Dict]:
        """List all Seafile libraries (repos)"""
        if not self.token:
            return []
        
        try:
            response = requests.get(
                f"{self.api_base}/repos/",
                headers=self.get_headers()
            )
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            print(f"Failed to list libraries: {e}")
            return []
    
    def create_library(self, name: str, desc: str = "") -> Optional[str]:
        """Create a new library and return its ID"""
        if not self.token:
            return None
        
        try:
            response = requests.post(
                f"{self.api_base}/repos/",
                headers=self.get_headers(),
                data={"name": name, "desc": desc}
            )
            if response.status_code == 200:
                return response.json().get("repo_id")
            return None
        except Exception as e:
            print(f"Failed to create library: {e}")
            return None
    
    def upload_file(self, repo_id: str, file_path: str, target_dir: str = "/") -> bool:
        """Upload a file to Seafile"""
        if not self.token:
            return False
        
        try:
            # Get upload link
            response = requests.get(
                f"{self.api_base}/repos/{repo_id}/upload-link/",
                headers=self.get_headers(),
                params={"p": target_dir}
            )
            
            if response.status_code != 200:
                return False
            
            upload_link = response.json()
            
            # Upload file
            with open(file_path, 'rb') as f:
                files = {'file': f}
                data = {'parent_dir': target_dir}
                upload_response = requests.post(
                    upload_link,
                    files=files,
                    data=data,
                    headers=self.get_headers()
                )
                
                return upload_response.status_code == 200
        except Exception as e:
            print(f"Failed to upload file: {e}")
            return False
    
    def download_file(self, repo_id: str, file_path: str) -> Optional[bytes]:
        """Download a file from Seafile"""
        if not self.token:
            return None
        
        try:
            response = requests.get(
                f"{self.api_base}/repos/{repo_id}/file/",
                headers=self.get_headers(),
                params={"p": file_path}
            )
            
            if response.status_code == 200:
                download_link = response.json()
                file_response = requests.get(download_link)
                if file_response.status_code == 200:
                    return file_response.content
            return None
        except Exception as e:
            print(f"Failed to download file: {e}")
            return None
    
    def list_directory(self, repo_id: str, dir_path: str = "/") -> List[Dict]:
        """List files in a directory"""
        if not self.token:
            return []
        
        try:
            response = requests.get(
                f"{self.api_base}/repos/{repo_id}/dir/",
                headers=self.get_headers(),
                params={"p": dir_path}
            )
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            print(f"Failed to list directory: {e}")
            return []

# Default client instance for Agent Lee
agent_lee_seafile = AgentLeeSeafileClient()

# Auto-authenticate with default credentials
if agent_lee_seafile.authenticate("admin@leeway.local", "leeway-admin-2026"):
    print("[Agent Lee] Successfully connected to Seafile storage")
else:
    print("[Agent Lee] Warning: Could not connect to Seafile storage")
