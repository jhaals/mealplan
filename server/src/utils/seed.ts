import { prisma } from '../db';

async function main() {
  console.log('Seeding database...');

  // Create singleton MealPlan if it doesn't exist
  const existingPlan = await prisma.mealPlan.findUnique({
    where: { id: 'singleton' },
  });

  if (existingPlan) {
    console.log('Singleton MealPlan already exists.');
  } else {
    const mealPlan = await prisma.mealPlan.create({
      data: {
        id: 'singleton',
      },
    });
    console.log('Created singleton MealPlan:', mealPlan);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
