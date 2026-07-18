import { prisma } from '../../prisma';

export async function submitFeedback(
  changeSetId: string,
  userId: string | null,
  rating: number,
  comment?: string
): Promise<void> {
  await prisma.aiFeedback.create({
    data: {
      changeSetId,
      userId,
      rating,
      comment,
    },
  });
}

export async function getFeedback(changeSetId: string) {
  return await prisma.aiFeedback.findMany({
    where: { changeSetId },
    orderBy: { createdAt: 'desc' },
  });
}
export { submitFeedback as saveFeedback };
export { getFeedback as fetchFeedback };
