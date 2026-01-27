// import mongoose from 'mongoose';
// import { Detection } from '../modules/detections/detections.model.js';
// import { User } from '../modules/users/users.model.js';
// import { config } from '../config/env.js';

// const seedData = async () => {
//     try {
//         await mongoose.connect(config.mongoUri);
//         console.log('Connected to MongoDB for seeding');

//         // Clear existing data
//         await Detection.deleteMany({ type: 'nest' });
//         await User.deleteMany({});

//         // Create a mock user
//         const userData = {
//             name: 'Franklin Admin',
//             email: 'migaradenuwan@gmail.com', // Using a real email for testing or placeholder
//             role: 'admin',
//             notifications: { email: true, web: true }
//         };
//         await User.create(userData);
//         console.log('Mock user created');

//         // Create mock nests
//         const mockNests = [
//             {
//                 type: 'nest',
//                 timestamp: new Date(),
//                 location: {
//                     zone: 'Beach Zone A',
//                     coordinates: { x: 33.6, y: 100 }
//                 },
//                 confidence: 0.98,
//                 nestStatus: 'safe',
//                 details: 'Mock Nest #101',
//                 videoSource: 'mock-data'
//             },
//             {
//                 type: 'nest',
//                 timestamp: new Date(),
//                 location: {
//                     zone: 'Beach Zone B',
//                     coordinates: { x: 55.2, y: 44.1 }
//                 },
//                 confidence: 0.95,
//                 nestStatus: 'safe',
//                 details: 'Mock Nest #202',
//                 videoSource: 'mock-data'
//             }
//         ];

//         await Detection.insertMany(mockNests);
//         console.log('Mock nests created');

//         await mongoose.disconnect();
//         console.log('Seeding complete');
//     } catch (error) {
//         console.error('Seeding failed:', error);
//     }
// };

// seedData();
