export class APIResponse {
  private error: boolean;
  private data: any;
  private statusCode: number;
  private timestamp: string;
  private requester: string;
  private message: string;

  constructor(
    error?: boolean,
    data?: any,
    statusCode?: number,
    requester?: string,
    message?: string,
  ) {
    this.error = error;
    this.data = data;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    this.requester = requester;
    this.message = message;
  }

  setError(error: boolean): APIResponse {
    this.error = error;
    return this;
  }
  setData(data: any): APIResponse {
    this.data = data;
    return this;
  }
  setStatusCode(statusCode: number): APIResponse {
    this.statusCode = statusCode;
    return this;
  }
  setRequester(requester: string): APIResponse {
    this.requester = requester;
    return this;
  }

  setMessage(message: string): APIResponse {
    this.message = message;
    return this;
  }

  build() {
    this.timestamp = new Date().toISOString();
    return this;
  }
}
