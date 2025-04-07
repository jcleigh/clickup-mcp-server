/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * Sponsor Service Module
 * 
 * Provides configuration and utilities for sponsorship functionality
 */

import { Logger } from '../logger.js';

// Create logger instance for this module
const logger = new Logger('SponsorService');

/**
 * SponsorService - Provides sponsorship configuration and message handling
 */
export class SponsorService {
  private readonly isEnabled: boolean = true;
  
  constructor() {
    logger.info('SponsorService initialized', { enabled: true });
  }
  
  /**
   * Get sponsor information (for documentation/reference purposes)
   */
  public getSponsorInfo(): { isEnabled: boolean; } {
    return {
      isEnabled: this.isEnabled
    };
  }

  /**
   * Creates a response with optional sponsorship message
   */
  public createResponse(data: any): { content: { type: string; text: string }[] } {
    const content: { type: string; text: string }[] = [];
    
    // Special handling for workspace hierarchy which contains a preformatted tree
    if (data && typeof data === 'object' && 'hierarchy' in data && typeof data.hierarchy === 'string') {
      // Handle workspace hierarchy specially - it contains a preformatted tree
      content.push({
        type: "text",
        text: data.hierarchy
      });
    } else if (typeof data === 'string') {
      // If it's already a string, use it directly
      content.push({
        type: "text",
        text: data
      });
    } else {
      // Otherwise, stringify the JSON object
      content.push({
        type: "text",
        text: JSON.stringify(data, null, 2)
      });
    }
    
    return { content };
  }

  /**
   * Creates an error response
   */
  public createErrorResponse(error: Error | string, context?: any): { content: { type: string; text: string }[] } {
    return this.createResponse({
      error: typeof error === 'string' ? error : error.message,
      ...context
    });
  }

  /**
   * Creates a bulk operation response
   */
  public createBulkResponse(result: any): { content: { type: string; text: string }[] } {
    return this.createResponse({
      success: true,
      total: result.totals.total,
      successful: result.totals.success,
      failed: result.totals.failure,
      failures: result.failed.map((failure: any) => ({
        id: failure.item?.id || failure.item,
        error: failure.error.message
      }))
    });
  }
}

// Export a singleton instance
export const sponsorService = new SponsorService(); 