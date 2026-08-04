"""
Receipts Writer - Audit trail for all SEA actions

This module writes receipts for every action that flows through SEA,
providing complete audit trails for governance, debugging, and compliance.

All receipts are written to: Archive/receipts/sea-execution/YYYY/MM/DD/
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
import uuid

from .models.execution_context import ExecutionContext, ExecutionResult

logger = logging.getLogger(__name__)


class ReceiptsWriter:
    """
    Writes audit receipts for all SEA executions.
    
    Every action that flows through SEA generates a receipt, including:
    - Governance approvals/rejections
    - Execution successes/failures
    - Adapter selections
    - Performance metrics
    
    Receipts are organized by date: Archive/receipts/sea-execution/YYYY/MM/DD/
    """
    
    RECEIPTS_BASE_DIR = Path("Archive/receipts/sea-execution")
    SCHEMA_VERSION = "sea-execution-v1"
    
    def __init__(self):
        """Initialize receipts writer"""
        self.receipts_written = 0
        self.last_receipt_path = None
        
        # Ensure base directory exists
        self.RECEIPTS_BASE_DIR.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Receipts writer initialized (dir: {self.RECEIPTS_BASE_DIR})")
    
    def write_approval(
        self,
        ctx: ExecutionContext,
        governance_details: Dict[str, Any]
    ) -> str:
        """
        Write receipt for governance approval.
        
        Args:
            ctx: Execution context that was approved
            governance_details: Details from governance check
            
        Returns:
            Path to written receipt file
        """
        receipt = self._build_base_receipt(ctx)
        receipt.update({
            "receipt_type": "governance_approval",
            "governance_decision": {
                "allowed": True,
                "standards_check": governance_details.get("standards_check", "PASS"),
                "laws_check": governance_details.get("laws_check", "PASS"),
                "reason": governance_details.get("reason", "approved"),
                "details": governance_details
            }
        })
        
        return self._write_receipt(receipt, ctx.request_id)
    
    def write_rejection(
        self,
        ctx: ExecutionContext,
        reason: str,
        governance_details: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Write receipt for governance rejection.
        
        Args:
            ctx: Execution context that was rejected
            reason: Reason for rejection
            governance_details: Optional details from governance check
            
        Returns:
            Path to written receipt file
        """
        receipt = self._build_base_receipt(ctx)
        receipt.update({
            "receipt_type": "governance_rejection",
            "governance_decision": {
                "allowed": False,
                "reason": reason,
                "details": governance_details or {}
            }
        })
        
        return self._write_receipt(receipt, ctx.request_id)
    
    def write_success(
        self,
        ctx: ExecutionContext,
        result: ExecutionResult,
        adapter_name: Optional[str] = None,
        subsystem_name: Optional[str] = None
    ) -> str:
        """
        Write receipt for successful execution.
        
        Args:
            ctx: Execution context
            result: Execution result
            adapter_name: Name of adapter used
            subsystem_name: Name of subsystem executed
            
        Returns:
            Path to written receipt file
        """
        receipt = self._build_base_receipt(ctx)
        receipt.update({
            "receipt_type": "execution_success",
            "execution_result": result.to_dict(),
            "adapter": adapter_name,
            "subsystem": subsystem_name
        })
        
        return self._write_receipt(receipt, ctx.request_id)
    
    def write_failure(
        self,
        ctx: ExecutionContext,
        error: str,
        error_details: Optional[Dict[str, Any]] = None,
        adapter_name: Optional[str] = None
    ) -> str:
        """
        Write receipt for failed execution.
        
        Args:
            ctx: Execution context
            error: Error message
            error_details: Optional error details
            adapter_name: Name of adapter that failed
            
        Returns:
            Path to written receipt file
        """
        receipt = self._build_base_receipt(ctx)
        receipt.update({
            "receipt_type": "execution_failure",
            "error": error,
            "error_details": error_details or {},
            "adapter": adapter_name
        })
        
        return self._write_receipt(receipt, ctx.request_id)
    
    def write_system_event(
        self,
        event_type: str,
        event_data: Dict[str, Any]
    ) -> str:
        """
        Write receipt for system-level events.
        
        Args:
            event_type: Type of system event
            event_data: Event data
            
        Returns:
            Path to written receipt file
        """
        receipt = {
            "receipt_id": self._generate_receipt_id(),
            "schema": self.SCHEMA_VERSION,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "receipt_type": "system_event",
            "event_type": event_type,
            "event_data": event_data
        }
        
        return self._write_receipt(receipt, f"system-{event_type}")
    
    def _build_base_receipt(self, ctx: ExecutionContext) -> Dict[str, Any]:
        """Build base receipt structure from execution context"""
        return {
            "receipt_id": self._generate_receipt_id(),
            "schema": self.SCHEMA_VERSION,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "execution_context": ctx.to_dict()
        }
    
    def _generate_receipt_id(self) -> str:
        """Generate unique receipt ID"""
        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        unique_id = uuid.uuid4().hex[:8]
        return f"sea-exec-{timestamp}-{unique_id}"
    
    def _write_receipt(self, receipt: Dict[str, Any], request_id: str) -> str:
        """
        Write receipt to disk.
        
        Args:
            receipt: Receipt data
            request_id: Request ID for filename
            
        Returns:
            Path to written receipt file
        """
        # Organize by date: YYYY/MM/DD
        now = datetime.utcnow()
        date_dir = self.RECEIPTS_BASE_DIR / str(now.year) / f"{now.month:02d}" / f"{now.day:02d}"
        date_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate filename
        timestamp = now.strftime("%Y%m%d-%H%M%S")
        filename = f"sea-exec-{timestamp}-{request_id[:8]}.json"
        receipt_path = date_dir / filename
        
        # Write receipt
        try:
            with open(receipt_path, 'w', encoding='utf-8') as f:
                json.dump(receipt, f, indent=2, ensure_ascii=False)
            
            self.receipts_written += 1
            self.last_receipt_path = str(receipt_path)
            
            logger.debug(f"Receipt written: {receipt_path}")
            
            return str(receipt_path)
            
        except (IOError, OSError) as e:
            logger.error(f"Failed to write receipt: {e}")
            raise RuntimeError(f"Failed to write receipt: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get receipts writer statistics.
        
        Returns:
            dict with stats including receipts_written, last_receipt_path
        """
        return {
            "receipts_written": self.receipts_written,
            "last_receipt_path": self.last_receipt_path,
            "receipts_base_dir": str(self.RECEIPTS_BASE_DIR)
        }
    
    def verify_receipt_exists(self, receipt_path: str) -> bool:
        """Verify that a receipt file exists"""
        return Path(receipt_path).exists()
    
    def read_receipt(self, receipt_path: str) -> Optional[Dict[str, Any]]:
        """
        Read a receipt file.
        
        Args:
            receipt_path: Path to receipt file
            
        Returns:
            Receipt data, or None if file doesn't exist or can't be read
        """
        try:
            with open(receipt_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (IOError, OSError, json.JSONDecodeError) as e:
            logger.error(f"Failed to read receipt {receipt_path}: {e}")
            return None
    
    def __repr__(self) -> str:
        """String representation for debugging"""
        return (
            f"ReceiptsWriter("
            f"written={self.receipts_written}, "
            f"dir={self.RECEIPTS_BASE_DIR})"
        )


# Convenience function for writing quick receipts
def write_quick_receipt(
    receipt_type: str,
    data: Dict[str, Any],
    request_id: Optional[str] = None
) -> str:
    """
    Write a quick receipt without full context.
    
    Args:
        receipt_type: Type of receipt
        data: Receipt data
        request_id: Optional request ID
        
    Returns:
        Path to written receipt
    """
    writer = ReceiptsWriter()
    
    receipt = {
        "receipt_id": writer._generate_receipt_id(),
        "schema": ReceiptsWriter.SCHEMA_VERSION,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "receipt_type": receipt_type,
        "data": data
    }
    
    return writer._write_receipt(receipt, request_id or "quick")

# Made with Bob
