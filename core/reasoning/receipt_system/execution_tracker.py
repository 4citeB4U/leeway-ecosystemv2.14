"""
Execution Tracker

Tracks execution lifecycle and writes receipts to Archive.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional
from .receipt_schema_engine import ExecutionReceipt


class ExecutionTracker:
    """Tracks execution and persists receipts"""
    
    def __init__(self, archive_root: str = "Archive/receipts"):
        self.archive_root = Path(archive_root)
        self.archive_root.mkdir(parents=True, exist_ok=True)
    
    def track_execution(
        self,
        receipt: ExecutionReceipt,
        category: str = "execution"
    ) -> str:
        """
        Track execution and write receipt.
        
        Args:
            receipt: ExecutionReceipt to persist
            category: Receipt category (execution, system-mutation, etc.)
            
        Returns:
            Path to written receipt
        """
        # Create timestamped path
        now = datetime.utcnow()
        year = now.strftime("%Y")
        month = now.strftime("%m")
        day = now.strftime("%d")
        timestamp = now.strftime("%Y%m%d-%H%M%S")
        
        # Build directory structure
        receipt_dir = self.archive_root / category / year / month / day
        receipt_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate filename
        intent = receipt.intent if receipt.intent else {}
        intent_type = intent.get("task_type", "unknown")
        filename = f"{intent_type}-{timestamp}.json"
        receipt_path = receipt_dir / filename
        
        # Write receipt
        with open(receipt_path, 'w', encoding='utf-8') as f:
            json.dump(receipt.to_dict(), f, indent=2, ensure_ascii=False)
        
        return str(receipt_path)
    
    def get_recent_receipts(
        self,
        category: str = "execution",
        limit: int = 10
    ) -> list:
        """
        Get recent receipts from category.
        
        Args:
            category: Receipt category
            limit: Maximum number of receipts
            
        Returns:
            List of receipt dictionaries
        """
        category_path = self.archive_root / category
        if not category_path.exists():
            return []
        
        # Find all receipt files
        receipt_files = sorted(
            category_path.rglob("*.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )[:limit]
        
        # Load receipts
        receipts = []
        for receipt_file in receipt_files:
            try:
                with open(receipt_file, 'r', encoding='utf-8') as f:
                    receipts.append(json.load(f))
            except Exception:
                continue
        
        return receipts
    
    def get_receipt_by_id(self, receipt_id: str) -> Optional[dict]:
        """
        Get receipt by ID.
        
        Args:
            receipt_id: Receipt ID to find
            
        Returns:
            Receipt dictionary or None
        """
        # Search all receipt files
        for receipt_file in self.archive_root.rglob("*.json"):
            try:
                with open(receipt_file, 'r', encoding='utf-8') as f:
                    receipt = json.load(f)
                    if receipt.get("receipt_id") == receipt_id:
                        return receipt
            except Exception:
                continue
        
        return None

# Made with Bob
