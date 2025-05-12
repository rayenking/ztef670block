export interface NetworkRequest {
  url: string;
  method: string;
  resourceType: string;
  timestamp: number;
  blocked: boolean;
}

export interface BlockedUrl {
  url: string;
  timestamp: number;
} 