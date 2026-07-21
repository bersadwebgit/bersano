import { RiskLevel } from '../types';
import { ChangeStepDto } from '../contracts/change-set';

export interface RiskAnalysis {
  riskLevel: RiskLevel;
  riskAnalysis: string;
}

export function evaluateRisk(steps: ChangeStepDto[]): RiskAnalysis {
  let highestRisk: RiskLevel = 'low';
  const reasons: string[] = [];

  for (const step of steps) {
    if (step.action === 'delete') {
      highestRisk = 'high';
      reasons.push(`حذف رکورد از مدل ${step.modelName} (شناسه: ${step.recordId || 'نامشخص'})`);
    } else if (step.modelName === 'Order') {
      highestRisk = 'high';
      reasons.push(`تغییر روی سفارشات (شناسه: ${step.recordId || 'نامشخص'})`);
    } else if (step.action === 'update' && step.modelName === 'Product') {
      const price = step.afterValue?.price;
      const stock = step.afterValue?.stock;
      if (price !== undefined && Number(price) <= 0) {
        highestRisk = 'high';
        reasons.push('تغییر قیمت محصول به صفر یا منفی');
      } else if (stock !== undefined && Number(stock) === 0) {
        highestRisk = 'medium';
        reasons.push('صفر کردن موجودی کالا در انبار');
      } else {
        if (highestRisk !== 'high') highestRisk = 'medium';
        reasons.push(`ویرایش محصول (شناسه: ${step.recordId})`);
      }
    } else if (step.action === 'create') {
      if (highestRisk === 'low') highestRisk = 'medium';
      reasons.push(`ایجاد رکورد جدید در ${step.modelName}`);
    }
  }

  const riskAnalysis = reasons.length > 0
    ? `بررسی ریسک: ${reasons.join('، ')}.`
    : 'تغییرات پیشنهادی کم‌ریسک هستند.';

  return { riskLevel: highestRisk, riskAnalysis };
}
