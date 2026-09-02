// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// async function main() {
//   console.log("Deleting reviews...");
//   const reviews = await prisma.review.deleteMany({});
//   console.log(`Deleted ${reviews.count} reviews`);

//   console.log("Deleting orders...");
//   const orders = await prisma.order.deleteMany({});
//   console.log(`Deleted ${orders.count} orders`);

//   console.log("Deleting listings (cascades to matches + listing requests)...");
//   const listings = await prisma.listing.deleteMany({});
//   console.log(`Deleted ${listings.count} listings`);

//   console.log("Deleting demands...");
//   const demands = await prisma.demand.deleteMany({});
//   console.log(`Deleted ${demands.count} demands`);

//   console.log("Deleting users (cascades to Farmer, Buyer, Seller, Field, ChatSession, PushSubscription)...");
//   const users = await prisma.user.deleteMany({});
//   console.log(`Deleted ${users.count} users`);

//   console.log("✅ Done — platform fully reset.");
// }

// main()
//   .catch((e) => {
//     console.error("❌ Error:", e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });