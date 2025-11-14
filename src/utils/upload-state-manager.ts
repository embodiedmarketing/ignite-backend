// Upload State Management System
// Prevents conflicts, race conditions, and ensures atomic operations

export interface UploadOperation {
  id: string;
  userId: number;
  operationType: 'transcript_upload' | 'text_extraction' | 'file_processing';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  fileName?: string;
  fileSize?: number;
  startTime: Date;
  completedTime?: Date;
  error?: string;
  metadata?: any;
}

export interface UploadResult {
  success: boolean;
  data?: any;
  error?: string;
  operationId?: string;
}

class UploadStateManager {
  private operations: Map<string, UploadOperation> = new Map();
  private userOperations: Map<number, Set<string>> = new Map();
  private processingQueue: Set<string> = new Set();
  
  // Maximum concurrent operations per user
  private readonly MAX_CONCURRENT_OPERATIONS = 3;
  private readonly OPERATION_TIMEOUT = 30000; // 30 seconds

  // Create new upload operation
  startOperation(
    userId: number, 
    operationType: UploadOperation['operationType'],
    metadata?: any
  ): string {
    // Check if user has too many concurrent operations
    const userOps = this.userOperations.get(userId) || new Set();
    const activeOps = Array.from(userOps).filter(opId => {
      const op = this.operations.get(opId);
      return op && (op.status === 'pending' || op.status === 'in_progress');
    });

    if (activeOps.length >= this.MAX_CONCURRENT_OPERATIONS) {
      throw new Error(`Too many concurrent operations. Limit: ${this.MAX_CONCURRENT_OPERATIONS}`);
    }

    const operationId = `${operationType}_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const operation: UploadOperation = {
      id: operationId,
      userId,
      operationType,
      status: 'pending',
      startTime: new Date(),
      metadata
    };

    this.operations.set(operationId, operation);
    
    if (!this.userOperations.has(userId)) {
      this.userOperations.set(userId, new Set());
    }
    this.userOperations.get(userId)!.add(operationId);

    // Set timeout for operation
    setTimeout(() => {
      this.timeoutOperation(operationId);
    }, this.OPERATION_TIMEOUT);

    console.log(`[UPLOAD STATE] Started operation ${operationId} for user ${userId}`);
    return operationId;
  }

  // Mark operation as in progress
  markInProgress(operationId: string, fileName?: string, fileSize?: number): boolean {
    const operation = this.operations.get(operationId);
    if (!operation) {
      console.error(`[UPLOAD STATE] Operation not found: ${operationId}`);
      return false;
    }

    if (operation.status !== 'pending') {
      console.warn(`[UPLOAD STATE] Operation ${operationId} already in state: ${operation.status}`);
      return false;
    }

    operation.status = 'in_progress';
    operation.fileName = fileName;
    operation.fileSize = fileSize;
    
    this.processingQueue.add(operationId);
    
    console.log(`[UPLOAD STATE] Operation ${operationId} in progress`);
    return true;
  }

  // Complete operation successfully
  completeOperation(operationId: string, data?: any): boolean {
    const operation = this.operations.get(operationId);
    if (!operation) {
      console.error(`[UPLOAD STATE] Operation not found: ${operationId}`);
      return false;
    }

    operation.status = 'completed';
    operation.completedTime = new Date();
    operation.metadata = { ...operation.metadata, result: data };
    
    this.processingQueue.delete(operationId);
    
    console.log(`[UPLOAD STATE] Operation ${operationId} completed successfully`);
    
    // Auto-cleanup completed operations after 5 minutes
    setTimeout(() => {
      this.cleanupOperation(operationId);
    }, 5 * 60 * 1000);

    return true;
  }

  // Fail operation with error
  failOperation(operationId: string, error: string): boolean {
    const operation = this.operations.get(operationId);
    if (!operation) {
      console.error(`[UPLOAD STATE] Operation not found: ${operationId}`);
      return false;
    }

    operation.status = 'failed';
    operation.error = error;
    operation.completedTime = new Date();
    
    this.processingQueue.delete(operationId);
    
    console.error(`[UPLOAD STATE] Operation ${operationId} failed: ${error}`);
    
    // Auto-cleanup failed operations after 10 minutes
    setTimeout(() => {
      this.cleanupOperation(operationId);
    }, 10 * 60 * 1000);

    return true;
  }

  // Cancel operation
  cancelOperation(operationId: string): boolean {
    const operation = this.operations.get(operationId);
    if (!operation) {
      console.error(`[UPLOAD STATE] Operation not found: ${operationId}`);
      return false;
    }

    if (operation.status === 'completed') {
      console.warn(`[UPLOAD STATE] Cannot cancel completed operation: ${operationId}`);
      return false;
    }

    operation.status = 'cancelled';
    operation.completedTime = new Date();
    
    this.processingQueue.delete(operationId);
    
    console.log(`[UPLOAD STATE] Operation ${operationId} cancelled`);
    
    // Immediate cleanup for cancelled operations
    setTimeout(() => {
      this.cleanupOperation(operationId);
    }, 60 * 1000);

    return true;
  }

  // Timeout operation
  private timeoutOperation(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    if (operation.status === 'pending' || operation.status === 'in_progress') {
      this.failOperation(operationId, 'Operation timed out');
    }
  }

  // Get operation status
  getOperation(operationId: string): UploadOperation | null {
    return this.operations.get(operationId) || null;
  }

  // Get user's active operations
  getUserOperations(userId: number): UploadOperation[] {
    const userOpIds = this.userOperations.get(userId) || new Set();
    return Array.from(userOpIds)
      .map(opId => this.operations.get(opId))
      .filter((op): op is UploadOperation => op !== undefined)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  // Check if user has conflicting operations
  hasConflictingOperation(userId: number, operationType: string): boolean {
    const userOps = this.getUserOperations(userId);
    return userOps.some(op => 
      op.operationType === operationType && 
      (op.status === 'pending' || op.status === 'in_progress')
    );
  }

  // Cleanup operation
  private cleanupOperation(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    this.operations.delete(operationId);
    this.processingQueue.delete(operationId);
    
    const userOps = this.userOperations.get(operation.userId);
    if (userOps) {
      userOps.delete(operationId);
      if (userOps.size === 0) {
        this.userOperations.delete(operation.userId);
      }
    }

    console.log(`[UPLOAD STATE] Cleaned up operation ${operationId}`);
  }

  // Cleanup all operations for user (on logout/session end)
  cleanupUserOperations(userId: number): void {
    const userOpIds = this.userOperations.get(userId) || new Set();
    for (const opId of userOpIds) {
      this.cancelOperation(opId);
    }
    console.log(`[UPLOAD STATE] Cleaned up all operations for user ${userId}`);
  }

  // Get system statistics
  getStats() {
    const totalOperations = this.operations.size;
    const processingOperations = this.processingQueue.size;
    const userCount = this.userOperations.size;
    
    const statusCounts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    };

    for (const operation of this.operations.values()) {
      statusCounts[operation.status]++;
    }

    return {
      totalOperations,
      processingOperations,
      userCount,
      statusCounts,
      queueSize: this.processingQueue.size
    };
  }
}

// Singleton instance
export const uploadStateManager = new UploadStateManager();

// Atomic upload operation wrapper
export async function executeAtomicUpload<T>(
  userId: number,
  operationType: UploadOperation['operationType'],
  operation: (operationId: string) => Promise<T>,
  metadata?: any
): Promise<UploadResult> {
  let operationId: string;
  
  try {
    // Check for conflicting operations
    if (uploadStateManager.hasConflictingOperation(userId, operationType)) {
      return {
        success: false,
        error: `Another ${operationType} operation is already in progress. Please wait for it to complete.`
      };
    }

    // Start operation
    operationId = uploadStateManager.startOperation(userId, operationType, metadata);
    
    // Mark as in progress
    uploadStateManager.markInProgress(operationId);
    
    // Execute the actual operation
    const result = await operation(operationId);
    
    // Mark as completed
    uploadStateManager.completeOperation(operationId, result);
    
    return {
      success: true,
      data: result,
      operationId
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (operationId!) {
      uploadStateManager.failOperation(operationId, errorMessage);
    }
    
    return {
      success: false,
      error: errorMessage,
      operationId: operationId!
    };
  }
}

export { UploadStateManager };

