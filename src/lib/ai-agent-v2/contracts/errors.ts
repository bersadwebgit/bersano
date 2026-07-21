export class AiAgentV2Error extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly persianMessage: string,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class UnauthorizedError extends AiAgentV2Error {
  constructor(message = 'Unauthorized access to AI Agent') {
    super(message, 'UNAUTHORIZED', 'شما دسترسی لازم برای استفاده از این قابلیت را ندارید.', 401);
  }
}

export class QuotaExceededError extends AiAgentV2Error {
  constructor(message = 'AI Quota exceeded') {
    super(message, 'QUOTA_EXCEEDED', 'سهمیه هوش مصنوعی شما برای این ماه به پایان رسیده است.', 403);
  }
}

export class InvalidRequestError extends AiAgentV2Error {
  constructor(message: string, persianMessage: string) {
    super(message, 'INVALID_REQUEST', persianMessage, 400);
  }
}

export class RoutingError extends AiAgentV2Error {
  constructor(message: string, persianMessage = 'خطا در تشخیص نوع درخواست و مسیریابی هوشمند.') {
    super(message, 'ROUTING_ERROR', persianMessage, 400);
  }
}

export class PlanningError extends AiAgentV2Error {
  constructor(message: string, persianMessage = 'خطا در برنامه‌ریزی و تولید طرح تغییرات.') {
    super(message, 'PLANNING_ERROR', persianMessage, 422);
  }
}

export class ExecutionError extends AiAgentV2Error {
  constructor(message: string, persianMessage = 'خطا در اجرای تراکنش تغییرات در دیتابیس.') {
    super(message, 'EXECUTION_ERROR', persianMessage, 500);
  }
}

export class RollbackError extends AiAgentV2Error {
  constructor(message: string, persianMessage = 'خطا در بازگردانی تغییرات قبلی.') {
    super(message, 'ROLLBACK_ERROR', persianMessage, 500);
  }
}

export class StalePlanError extends AiAgentV2Error {
  constructor(message = 'Plan is stale and cannot be executed') {
    super(message, 'STALE_PLAN', 'طرح تغییرات منقضی شده یا اطلاعات دیتابیس پس از تایید تغییر یافته است. لطفا دوباره طرح را ایجاد کنید.', 400);
  }
}

export class InvalidTransitionError extends AiAgentV2Error {
  constructor(from: string, to: string) {
    super(
      `Invalid state transition from ${from} to ${to}`,
      'INVALID_TRANSITION',
      `تغییر وضعیت نامعتبر از ${from} به ${to}.`,
      400
    );
  }
}
