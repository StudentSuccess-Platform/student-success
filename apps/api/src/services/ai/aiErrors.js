// Typed AI failures. The teacher endpoints map these to a controlled body with fallback "manual".

export class AiUnavailableError extends Error {
  constructor(message = "The AI service is unavailable. You can create a plan manually.") {
    super(message);
    this.name = "AiUnavailableError";
    this.status = 503;
    this.code = "AI_UNAVAILABLE";
  }
}

export class AiInvalidResponseError extends Error {
  constructor(message = "The AI returned an unusable response. You can create a plan manually.") {
    super(message);
    this.name = "AiInvalidResponseError";
    this.status = 502;
    this.code = "AI_INVALID_RESPONSE";
  }
}
